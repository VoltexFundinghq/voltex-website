import { createServiceClient } from "@/lib/supabase/service";

export interface ActiveTraderStats {
  activeChallengeTraders: number;
  fundedTraders: number;
  nearBreach: number;
  inProfit: number;
  inDrawdown: number;
  awaitingSync: number;
}

export interface ActiveTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  account_login: string | null;
  currentPhase: number;
  status: string;
  balance: number | null;
  equity: number | null;
  floatingPL: number | null;
  todaysPL: number | null;
  maxDrawdownUsedPercent: number;
  lastSync: string | null;
  isNearBreach: boolean;
}

export interface ActiveTraderListResult {
  traders: ActiveTraderRow[];
  totalCount: number;
}

export interface TimelineStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
}

export interface ActiveTraderDetail {
  trader: { name: string | null; email: string; username: string | null; country: string | null };
  challenge: { challengeSize: number | null; phase: number; startDate: string | null; status: string };
  tradingAccount: { mt5Login: string | null; server: string | null; broker: string | null; vpsSlot: string | null };
  performance: {
    balance: number | null;
    equity: number | null;
    floatingPL: number | null;
    todaysPL: number | null;
    maxDrawdownUsedPercent: number;
    profitTargetProgressPercent: number;
  };
  risk: {
    maxDrawdownRemainingPercent: number;
    profitTargetRemainingPercent: number;
    fixedAllowedLossAmount: number | null;
  };
  timeline: TimelineStep[];
  liveStatus: { online: boolean; lastSync: string | null; lastTradeActivity: string | null };
  userId: string;
}

function computeDrawdownUsedPercent(peakClosedBalance: number | null, equity: number | null, accountSize: number | null, drawdownLimit: number): number {
  if (peakClosedBalance === null || equity === null || accountSize === null) return 0;
  const fixedAllowedLoss = accountSize * (drawdownLimit / 100);
  if (fixedAllowedLoss <= 0) return 0;
  const used = Math.max(0, peakClosedBalance - equity);
  return Math.min(100, Math.round((used / fixedAllowedLoss) * 100));
}

function computeProfitTargetProgress(balance: number | null, accountSize: number | null, profitTarget: number): number {
  if (balance === null || accountSize === null) return 0;
  const targetAmount = accountSize * (profitTarget / 100);
  if (targetAmount <= 0) return 0;
  const gain = balance - accountSize;
  return Math.max(0, Math.min(100, Math.round((gain / targetAmount) * 100)));
}

const NEAR_BREACH_THRESHOLD = 75; // admin-tool convention for flagging attention, not a formal rule threshold
const STALE_SYNC_SECONDS = 60;

export async function getActiveTraderStats(): Promise<ActiveTraderStats> {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("id, current_phase, peak_closed_balance, last_known_balance, last_known_equity, last_known_check_at, drawdown_limit, trading_account_id")
    .eq("status", "active");

  const rows = (query.data as any[]) ?? [];
  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  let nearBreach = 0, inProfit = 0, inDrawdown = 0, awaitingSync = 0;

  for (const r of rows) {
    const accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    const usedPercent = computeDrawdownUsedPercent(r.peak_closed_balance, r.last_known_equity, accountSize, r.drawdown_limit);
    if (usedPercent >= NEAR_BREACH_THRESHOLD) nearBreach++;
    if (accountSize !== null && r.last_known_balance !== null) {
      if (r.last_known_balance > accountSize) inProfit++;
      else if (r.last_known_balance < accountSize) inDrawdown++;
    }
    const isStale = !r.last_known_check_at || (Date.now() - new Date(r.last_known_check_at).getTime()) > STALE_SYNC_SECONDS * 1000;
    if (isStale) awaitingSync++;
  }

  return {
    activeChallengeTraders: rows.filter((r) => r.current_phase !== 3).length,
    fundedTraders: rows.filter((r) => r.current_phase === 3).length,
    nearBreach,
    inProfit,
    inDrawdown,
    awaitingSync,
  };
}

export async function getActiveTradersPage(params: {
  search?: string;
  filter?: string;
  page: number;
  pageSize: number;
}): Promise<ActiveTraderListResult> {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const term = search.trim();
    const usersQuery = await serviceClient
      .from("users")
      .select("id")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,username.ilike.%${term}%`);
    matchingUserIds = (usersQuery.data as { id: string }[] ?? []).map((u) => u.id);
  }

  let query = serviceClient.from("user_challenges").select("*").eq("status", "active");

  if (search && search.trim()) {
    const term = search.trim();
    const orParts = [`account_login.ilike.%${term}%`, `id.eq.${term}`];
    if (matchingUserIds && matchingUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchingUserIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  if (filter === "phase1") query = query.eq("current_phase", 1);
  else if (filter === "phase2") query = query.eq("current_phase", 2);
  else if (filter === "funded") query = query.eq("current_phase", 3);

  const allMatchingQuery = await query.order("created_at", { ascending: false });
  let rows = (allMatchingQuery.data as any[]) ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0
    ? await serviceClient.from("users").select("id, email, full_name").in("id", userIds)
    : { data: [] as any[] };
  const usersById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u]));

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const challengeIds = rows.map((r) => r.id);
  const todaysTradesQuery = challengeIds.length > 0
    ? await serviceClient.from("recorded_trades").select("user_challenge_id, profit").in("user_challenge_id", challengeIds).gte("close_time", todayStart)
    : { data: [] as any[] };
  const todaysPLByChallenge = new Map<string, number>();
  for (const t of (todaysTradesQuery.data as any[] ?? [])) {
    todaysPLByChallenge.set(t.user_challenge_id, (todaysPLByChallenge.get(t.user_challenge_id) ?? 0) + Number(t.profit));
  }

  let enriched: ActiveTraderRow[] = rows.map((r) => {
    const user = usersById.get(r.user_id);
    const accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    const usedPercent = computeDrawdownUsedPercent(r.peak_closed_balance, r.last_known_equity, accountSize, r.drawdown_limit);
    const floatingPL = r.last_known_equity !== null && r.last_known_balance !== null ? r.last_known_equity - r.last_known_balance : null;

    return {
      id: r.id,
      email: user?.email ?? "unknown",
      full_name: user?.full_name ?? null,
      account_login: r.account_login,
      currentPhase: r.current_phase,
      status: r.current_phase === 3 ? "Funded" : `Phase ${r.current_phase}`,
      balance: r.last_known_balance,
      equity: r.last_known_equity,
      floatingPL,
      todaysPL: todaysPLByChallenge.get(r.id) ?? 0,
      maxDrawdownUsedPercent: usedPercent,
      lastSync: r.last_known_check_at,
      isNearBreach: usedPercent >= NEAR_BREACH_THRESHOLD,
    };
  });

  if (filter === "near_breach") enriched = enriched.filter((t) => t.isNearBreach);
  else if (filter === "in_profit") enriched = enriched.filter((t) => t.balance !== null && sizeById.get(rows.find((r) => r.id === t.id)?.trading_account_id) < t.balance);
  else if (filter === "in_drawdown") enriched = enriched.filter((t) => t.balance !== null && t.balance < (sizeById.get(rows.find((r) => r.id === t.id)?.trading_account_id) ?? Infinity));
  else if (filter === "trading_today") enriched = enriched.filter((t) => (todaysPLByChallenge.get(t.id) ?? 0) !== 0);
  else if (filter === "no_recent_activity") enriched = enriched.filter((t) => !t.lastSync || (Date.now() - new Date(t.lastSync).getTime()) > STALE_SYNC_SECONDS * 1000);

  const totalCount = enriched.length;
  const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);

  return { traders: pageItems, totalCount };
}

export async function getActiveTraderDetail(challengeId: string): Promise<ActiveTraderDetail | null> {
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("*").eq("id", challengeId).single();
  const challenge = challengeQuery.data as any;
  if (challengeQuery.error || !challenge) return null;

  const userQuery = await serviceClient.from("users").select("id, email, full_name, username, country").eq("id", challenge.user_id).single();
  const user = userQuery.data as any;

  const accountQuery = challenge.trading_account_id
    ? await serviceClient.from("trading_accounts").select("account_size").eq("id", challenge.trading_account_id).single()
    : { data: null };
  const accountSize = (accountQuery.data as any)?.account_size ?? null;

  const slotQuery = await serviceClient.from("vps_slots").select("slot_label").eq("current_user_challenge_id", challengeId).maybeSingle();
  const vpsSlot = (slotQuery.data as { slot_label: string } | null)?.slot_label ?? null;

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const todaysTradesQuery = await serviceClient.from("recorded_trades").select("profit").eq("user_challenge_id", challengeId).gte("close_time", todayStart);
  const todaysPL = (todaysTradesQuery.data as { profit: number }[] ?? []).reduce((s, t) => s + Number(t.profit), 0);

  const lastTradeQuery = await serviceClient.from("recorded_trades").select("close_time").eq("user_challenge_id", challengeId).order("close_time", { ascending: false }).limit(1).maybeSingle();
  const lastTradeActivity = (lastTradeQuery.data as { close_time: string } | null)?.close_time ?? null;

  const usedPercent = computeDrawdownUsedPercent(challenge.peak_closed_balance, challenge.last_known_equity, accountSize, challenge.drawdown_limit);
  const progressPercent = computeProfitTargetProgress(challenge.last_known_balance, accountSize, challenge.profit_target);
  const fixedAllowedLoss = accountSize !== null ? accountSize * (challenge.drawdown_limit / 100) : null;

  const isOnline = !!challenge.last_known_check_at && (Date.now() - new Date(challenge.last_known_check_at).getTime()) < STALE_SYNC_SECONDS * 1000;

  const timeline: TimelineStep[] = [
    { label: "Challenge Started", timestamp: challenge.start_date ?? challenge.created_at, reached: true },
    { label: "Last Sync", timestamp: challenge.last_known_check_at, reached: !!challenge.last_known_check_at },
    { label: "Last Trade Closed", timestamp: lastTradeActivity, reached: !!lastTradeActivity },
    { label: "Drawdown Warning Issued", timestamp: challenge.drawdown_warning_sent_at, reached: !!challenge.drawdown_warning_sent },
    { label: "Challenge Passed", timestamp: challenge.completed_at, reached: challenge.status === "passed" },
  ];

  return {
    trader: { name: user?.full_name ?? null, email: user?.email ?? "unknown", username: user?.username ?? null, country: user?.country ?? null },
    challenge: { challengeSize: accountSize, phase: challenge.current_phase, startDate: challenge.start_date, status: challenge.status },
    tradingAccount: { mt5Login: challenge.account_login, server: challenge.account_server, broker: challenge.account_broker, vpsSlot },
    performance: {
      balance: challenge.last_known_balance,
      equity: challenge.last_known_equity,
      floatingPL: challenge.last_known_equity !== null && challenge.last_known_balance !== null ? challenge.last_known_equity - challenge.last_known_balance : null,
      todaysPL,
      maxDrawdownUsedPercent: usedPercent,
      profitTargetProgressPercent: progressPercent,
    },
    risk: {
      maxDrawdownRemainingPercent: 100 - usedPercent,
      profitTargetRemainingPercent: 100 - progressPercent,
      fixedAllowedLossAmount: fixedAllowedLoss,
    },
    timeline,
    liveStatus: { online: isOnline, lastSync: challenge.last_known_check_at, lastTradeActivity },
    userId: challenge.user_id,
  };
}

export interface ChartData {
  byChallengeSize: { size: string; count: number }[];
  profitVsDrawdown: { name: string; value: number }[];
  phaseDistribution: { phase: string; count: number }[];
  avgProfitTargetProgress: number;
}

export async function getActiveTraderCharts(): Promise<ChartData> {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("current_phase, last_known_balance, drawdown_limit, profit_target, trading_account_id")
    .eq("status", "active");

  const rows = (query.data as any[]) ?? [];
  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  const sizeCounts = new Map<number, number>();
  const phaseCounts = new Map<number, number>();
  let inProfit = 0, inDrawdown = 0, flat = 0;
  let totalProgress = 0, progressCount = 0;

  for (const r of rows) {
    const size = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    if (size !== null) sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);
    phaseCounts.set(r.current_phase, (phaseCounts.get(r.current_phase) ?? 0) + 1);

    if (size !== null && r.last_known_balance !== null) {
      if (r.last_known_balance > size) inProfit++;
      else if (r.last_known_balance < size) inDrawdown++;
      else flat++;
      totalProgress += computeProfitTargetProgress(r.last_known_balance, size, r.profit_target);
      progressCount++;
    }
  }

  return {
    byChallengeSize: [...sizeCounts.entries()].sort((a, b) => a[0] - b[0]).map(([size, count]) => ({ size: `₦${size.toLocaleString()}`, count })),
    profitVsDrawdown: [
      { name: "In Profit", value: inProfit },
      { name: "In Drawdown", value: inDrawdown },
      { name: "Flat", value: flat },
    ],
    phaseDistribution: [...phaseCounts.entries()].sort((a, b) => a[0] - b[0]).map(([phase, count]) => ({ phase: phase === 3 ? "Funded" : `Phase ${phase}`, count })),
    avgProfitTargetProgress: progressCount > 0 ? Math.round(totalProgress / progressCount) : 0,
  };
}
