import { createServiceClient } from "@/lib/supabase/service";

export interface ActiveTraderStats {
  activeChallengeAccounts: number;
  activeFundedAccounts: number;
  nearMaxDrawdown: number;
  awaitingVpsSync: number;
  inProfit: number;
}

export type HealthScore = "excellent" | "good" | "warning" | "critical";
export type LiveStatusColor = "online" | "delayed" | "near_drawdown";

export interface ActiveTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  account_login: string | null;
  accountSize: number | null;
  currentPhase: number;
  status: string;
  balance: number | null;
  equity: number | null;
  dailyPL: number | null;
  drawdownUsedPercent: number;
  profitPercent: number;
  lastSync: string | null;
  openTrades: number | null;
  vpsSlot: string | null;
  liveStatus: LiveStatusColor;
  healthScore: HealthScore;
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
  challenge: { accountSize: number | null; phase: number; startDate: string | null; status: string; provisionedAt: string | null };
  tradingAccount: {
    mt5LoginMasked: string | null;
    passwordMasked: string;
    server: string | null;
    broker: string | null;
    vpsSlot: string | null;
  };
  performance: {
    balance: number | null;
    equity: number | null;
    peakClosedBalance: number | null;
    floatingPL: number | null;
    totalProfit: number | null;
    dailyPL: number | null;
    drawdownUsedPercent: number;
    profitTargetProgressPercent: number;
    maxDrawdownRemainingPercent: number;
    profitTargetPercent: number;
    fixedAllowedLossAmount: number | null;
  };
  latestRiskEvent: string | null;
  latestPayoutRequest: { amount: number; status: string; requestedAt: string } | null;
  latestAdminNote: string;
  timeline: TimelineStep[];
  liveStatus: { online: boolean; lastSync: string | null };
}

export interface ChartData {
  byAccountSize: { size: string; count: number }[];
  phaseDistribution: { phase: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
}

export interface ActivityFeedEvent {
  text: string;
  timestamp: string;
}

const NEAR_BREACH_THRESHOLD = 75;
const STALE_SYNC_SECONDS = 60;

function maskString(value: string | null, visibleChars = 0): string {
  if (!value) return "—";
  if (visibleChars === 0) return "•".repeat(Math.min(value.length, 12));
  return value.slice(0, visibleChars) + "•".repeat(Math.max(0, value.length - visibleChars));
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

function computeLiveStatus(isStale: boolean, drawdownUsedPercent: number): LiveStatusColor {
  if (isStale) return "delayed";
  if (drawdownUsedPercent >= NEAR_BREACH_THRESHOLD) return "near_drawdown";
  return "online";
}

function computeHealthScore(isStale: boolean, drawdownUsedPercent: number, hasWarnings: boolean): HealthScore {
  let score = 100;
  if (isStale) score -= 40;
  if (drawdownUsedPercent >= 90) score -= 40;
  else if (drawdownUsedPercent >= 75) score -= 20;
  else if (drawdownUsedPercent >= 50) score -= 10;
  if (hasWarnings) score -= 15;

  if (score >= 85) return "excellent";
  if (score >= 60) return "good";
  if (score >= 35) return "warning";
  return "critical";
}

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

  let nearDrawdown = 0, awaitingSync = 0, inProfit = 0;

  for (const r of rows) {
    const accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    const usedPercent = computeDrawdownUsedPercent(r.peak_closed_balance, r.last_known_equity, accountSize, r.drawdown_limit);
    if (usedPercent >= NEAR_BREACH_THRESHOLD) nearDrawdown++;
    const isStale = !r.last_known_check_at || (Date.now() - new Date(r.last_known_check_at).getTime()) > STALE_SYNC_SECONDS * 1000;
    if (isStale) awaitingSync++;
    if (accountSize !== null && r.last_known_balance !== null && r.last_known_balance > accountSize) inProfit++;
  }

  return {
    activeChallengeAccounts: rows.filter((r) => r.current_phase !== 3).length,
    activeFundedAccounts: rows.filter((r) => r.current_phase === 3).length,
    nearMaxDrawdown: nearDrawdown,
    awaitingVpsSync: awaitingSync,
    inProfit,
  };
}

export async function getActiveTraderCharts(): Promise<ChartData> {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("id, current_phase, peak_closed_balance, last_known_equity, last_known_check_at, drawdown_limit, trading_account_id")
    .eq("status", "active");

  const rows = (query.data as any[]) ?? [];
  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  const sizeCounts = new Map<number, number>();
  const phaseCounts = new Map<number, number>();
  let healthy = 0, nearBreach = 0;

  const correlationQuery = await serviceClient.from("correlation_flags").select("id").eq("status", "pending_review");
  const pendingReviewCount = (correlationQuery.data as any[] ?? []).length;

  for (const r of rows) {
    const size = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    if (size !== null) sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);
    phaseCounts.set(r.current_phase, (phaseCounts.get(r.current_phase) ?? 0) + 1);

    const usedPercent = computeDrawdownUsedPercent(r.peak_closed_balance, r.last_known_equity, size, r.drawdown_limit);
    if (usedPercent >= NEAR_BREACH_THRESHOLD) nearBreach++;
    else healthy++;
  }

  return {
    byAccountSize: [...sizeCounts.entries()].sort((a, b) => a[0] - b[0]).map(([size, count]) => ({ size: `₦${size.toLocaleString()}`, count })),
    phaseDistribution: [...phaseCounts.entries()].sort((a, b) => a[0] - b[0]).map(([phase, count]) => ({ phase: phase === 3 ? "Funded" : `Phase ${phase}`, count })),
    statusDistribution: [
      { status: "Healthy", count: healthy },
      { status: "Near Breach", count: nearBreach },
      { status: "Awaiting Review", count: pendingReviewCount },
    ],
  };
}

export async function getActiveTradersPage(params: {
  search?: string;
  filters?: {
    accountSize?: string;
    phase?: string;
    status?: string;
    profitability?: string;
    country?: string;
    vpsSlot?: string;
    riskLevel?: string;
  };
  page: number;
  pageSize: number;
}): Promise<ActiveTraderListResult> {
  const serviceClient = createServiceClient();
  const { search, filters = {}, page, pageSize } = params;

  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const term = search.trim();
    const usersQuery = await serviceClient
      .from("users")
      .select("id")
      .or(`email.ilike.%${term}%,username.ilike.%${term}%`);
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

  if (filters.phase === "phase1") query = query.eq("current_phase", 1);
  else if (filters.phase === "phase2") query = query.eq("current_phase", 2);
  else if (filters.phase === "funded") query = query.eq("current_phase", 3);

  const allMatchingQuery = await query.order("created_at", { ascending: false });
  let rows = (allMatchingQuery.data as any[]) ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0
    ? await serviceClient.from("users").select("id, email, full_name, username, country").in("id", userIds)
    : { data: [] as any[] };
  const usersById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u]));

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  const slotsQuery = await serviceClient.from("vps_slots").select("slot_label, current_user_challenge_id");
  const slotByChallenge = new Map((slotsQuery.data as any[] ?? []).map((s) => [s.current_user_challenge_id, s.slot_label]));

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const challengeIds = rows.map((r) => r.id);
  const todaysTradesQuery = challengeIds.length > 0
    ? await serviceClient.from("recorded_trades").select("user_challenge_id, profit").in("user_challenge_id", challengeIds).gte("close_time", todayStart)
    : { data: [] as any[] };
  const dailyPLByChallenge = new Map<string, number>();
  for (const t of (todaysTradesQuery.data as any[] ?? [])) {
    dailyPLByChallenge.set(t.user_challenge_id, (dailyPLByChallenge.get(t.user_challenge_id) ?? 0) + Number(t.profit));
  }

  let enriched: ActiveTraderRow[] = rows.map((r) => {
    const user = usersById.get(r.user_id);
    const accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    const usedPercent = computeDrawdownUsedPercent(r.peak_closed_balance, r.last_known_equity, accountSize, r.drawdown_limit);
    const profitPercent = computeProfitTargetProgress(r.last_known_balance, accountSize, r.profit_target);
    const isStale = !r.last_known_check_at || (Date.now() - new Date(r.last_known_check_at).getTime()) > STALE_SYNC_SECONDS * 1000;
    const hasWarnings = r.hold_time_warnings_notified > 0 || r.drawdown_warning_sent || r.weekend_hold_warnings > 0;

    return {
      id: r.id,
      email: user?.email ?? "unknown",
      full_name: user?.full_name ?? null,
      username: user?.username ?? null,
      country: user?.country ?? null,
      account_login: r.account_login,
      accountSize,
      currentPhase: r.current_phase,
      status: r.current_phase === 3 ? "Funded" : `Phase ${r.current_phase}`,
      balance: r.last_known_balance,
      equity: r.last_known_equity,
      dailyPL: dailyPLByChallenge.get(r.id) ?? 0,
      drawdownUsedPercent: usedPercent,
      profitPercent,
      lastSync: r.last_known_check_at,
      openTrades: r.last_known_open_trades,
      vpsSlot: slotByChallenge.get(r.id) ?? null,
      liveStatus: computeLiveStatus(isStale, usedPercent),
      healthScore: computeHealthScore(isStale, usedPercent, hasWarnings),
    };
  });

  if (filters.accountSize) enriched = enriched.filter((t) => t.accountSize === Number(filters.accountSize));
  if (filters.country) enriched = enriched.filter((t) => t.country === filters.country);
  if (filters.vpsSlot) enriched = enriched.filter((t) => t.vpsSlot === filters.vpsSlot);
  if (filters.profitability === "in_profit") enriched = enriched.filter((t) => t.balance !== null && t.accountSize !== null && t.balance > t.accountSize);
  else if (filters.profitability === "in_drawdown") enriched = enriched.filter((t) => t.balance !== null && t.accountSize !== null && t.balance < t.accountSize);
  if (filters.riskLevel) enriched = enriched.filter((t) => t.healthScore === filters.riskLevel);
  if (filters.status === "near_breach") enriched = enriched.filter((t) => t.liveStatus === "near_drawdown");
  else if (filters.status === "delayed") enriched = enriched.filter((t) => t.liveStatus === "delayed");
  else if (filters.status === "online") enriched = enriched.filter((t) => t.liveStatus === "online");

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
    ? await serviceClient.from("trading_accounts").select("account_size, assigned_at").eq("id", challenge.trading_account_id).single()
    : { data: null };
  const account = accountQuery.data as any;
  const accountSize = account?.account_size ?? null;

  const slotQuery = await serviceClient.from("vps_slots").select("slot_label").eq("current_user_challenge_id", challengeId).maybeSingle();
  const vpsSlot = (slotQuery.data as { slot_label: string } | null)?.slot_label ?? null;

  const payoutQuery = await serviceClient
    .from("payout_requests")
    .select("amount, status, requested_at")
    .eq("user_id", challenge.user_id)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestPayout = payoutQuery.data as { amount: number; status: string; requested_at: string } | null;

  const usedPercent = computeDrawdownUsedPercent(challenge.peak_closed_balance, challenge.last_known_equity, accountSize, challenge.drawdown_limit);
  const progressPercent = computeProfitTargetProgress(challenge.last_known_balance, accountSize, challenge.profit_target);
  const fixedAllowedLoss = accountSize !== null ? accountSize * (challenge.drawdown_limit / 100) : null;
  const isOnline = !!challenge.last_known_check_at && (Date.now() - new Date(challenge.last_known_check_at).getTime()) < STALE_SYNC_SECONDS * 1000;

  let latestRiskEvent: string | null = null;
  if (challenge.drawdown_warning_sent) latestRiskEvent = `Drawdown warning (15%) — ${challenge.drawdown_warning_sent_at ? new Date(challenge.drawdown_warning_sent_at).toLocaleString() : "date unknown"}`;
  else if (challenge.hold_time_warnings_notified > 0) latestRiskEvent = `Hold-time warning ${challenge.hold_time_warnings_notified}/3`;
  else if (challenge.weekend_hold_warnings > 0) latestRiskEvent = `Weekend-holding warning ${challenge.weekend_hold_warnings}/1`;

  const timeline: TimelineStep[] = [
    { label: "Challenge Started", timestamp: challenge.start_date ?? challenge.created_at, reached: true },
    { label: "Last VPS Sync", timestamp: challenge.last_known_check_at, reached: !!challenge.last_known_check_at },
    { label: "Drawdown Warning Issued", timestamp: challenge.drawdown_warning_sent_at, reached: !!challenge.drawdown_warning_sent },
  ];

  return {
    trader: { name: user?.full_name ?? null, email: user?.email ?? "unknown", username: user?.username ?? null, country: user?.country ?? null },
    challenge: { accountSize, phase: challenge.current_phase, startDate: challenge.start_date, status: challenge.status, provisionedAt: account?.assigned_at ?? null },
    tradingAccount: {
      mt5LoginMasked: maskString(challenge.account_login),
      passwordMasked: "••••••••",
      server: challenge.account_server,
      broker: challenge.account_broker,
      vpsSlot,
    },
    performance: {
      balance: challenge.last_known_balance,
      equity: challenge.last_known_equity,
      peakClosedBalance: challenge.peak_closed_balance,
      floatingPL: challenge.last_known_equity !== null && challenge.last_known_balance !== null ? challenge.last_known_equity - challenge.last_known_balance : null,
      totalProfit: challenge.last_known_balance !== null && accountSize !== null ? challenge.last_known_balance - accountSize : null,
      dailyPL: null,
      drawdownUsedPercent: usedPercent,
      profitTargetProgressPercent: progressPercent,
      maxDrawdownRemainingPercent: 100 - usedPercent,
      profitTargetPercent: Number(challenge.profit_target),
      fixedAllowedLossAmount: fixedAllowedLoss,
    },
    latestRiskEvent,
    latestPayoutRequest: latestPayout ? { amount: Number(latestPayout.amount), status: latestPayout.status, requestedAt: latestPayout.requested_at } : null,
    latestAdminNote: "Not implemented yet — no admin notes system exists.",
    timeline,
    liveStatus: { online: isOnline, lastSync: challenge.last_known_check_at },
  };
}

export async function getActiveTraderActivityFeed(limit = 12): Promise<ActivityFeedEvent[]> {
  const serviceClient = createServiceClient();

  const [provisionedQuery, payoutsQuery, warningsQuery] = await Promise.all([
    serviceClient.from("trading_accounts").select("login, assigned_at").eq("status", "assigned").not("assigned_at", "is", null).order("assigned_at", { ascending: false }).limit(limit),
    serviceClient.from("payout_requests").select("amount, requested_at, user_id").order("requested_at", { ascending: false }).limit(limit),
    serviceClient.from("user_challenges").select("account_login, drawdown_warning_sent_at").eq("status", "active").not("drawdown_warning_sent_at", "is", null).order("drawdown_warning_sent_at", { ascending: false }).limit(limit),
  ]);

  const payoutUserIds = [...new Set((payoutsQuery.data as any[] ?? []).map((p) => p.user_id))];
  const usersQuery = payoutUserIds.length > 0
    ? await serviceClient.from("users").select("id, email").in("id", payoutUserIds)
    : { data: [] as any[] };
  const emailsById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u.email]));

  const events: ActivityFeedEvent[] = [];
  for (const p of (provisionedQuery.data as any[] ?? [])) {
    events.push({ text: `Account ${p.login} provisioned`, timestamp: p.assigned_at });
  }
  for (const p of (payoutsQuery.data as any[] ?? [])) {
    events.push({ text: `${emailsById.get(p.user_id) ?? "A trader"} requested a payout of ₦${Number(p.amount).toLocaleString()}`, timestamp: p.requested_at });
  }
  for (const w of (warningsQuery.data as any[] ?? [])) {
    events.push({ text: `Drawdown warning issued for ${w.account_login}`, timestamp: w.drawdown_warning_sent_at });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}
