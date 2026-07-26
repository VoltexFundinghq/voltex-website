import { createServiceClient } from "@/lib/supabase/service";

export interface FundedTraderStats {
  activeFundedTraders: number;
  totalFundedCapital: number;
  currentlyProfitable: number;
  nearMaxDrawdown: number;
  pendingPayoutRequests: number;
  avgProfitThisMonthPercent: number;
}

export type HealthScore = "excellent" | "good" | "warning" | "critical";
export type LiveStatusColor = "online" | "delayed" | "near_drawdown";
export type PayoutStatus = "none" | "pending" | "approved" | "rejected";

export interface FundedTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  account_login: string | null;
  accountSize: number | null;
  balance: number | null;
  equity: number | null;
  floatingPL: number | null;
  profitPercent: number;
  drawdownUsedPercent: number;
  status: LiveStatusColor;
  lastSync: string | null;
  openTrades: number | null;
  lastActivity: string | null;
  vpsSlot: string | null;
  payoutStatus: PayoutStatus;
  healthScore: HealthScore;
}

export interface FundedTraderListResult {
  traders: FundedTraderRow[];
  totalCount: number;
}

export interface WorkflowStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  current?: boolean;
}

export interface FundedTraderDetail {
  customer: { name: string | null; email: string; username: string | null; country: string | null; phone: string | null };
  funding: {
    originalChallengeSize: number | null;
    fundedDate: string | null;
    fundedAccountSize: number | null;
    currentStage: string;
    profitSplit: number;
    currentCycleNumber: number;
  };
  tradingAccount: {
    mt5Login: string | null;
    server: string | null;
    vpsSlot: string | null;
    balance: number | null;
    equity: number | null;
    floatingPL: number | null;
    highestEquity: number | null;
    currentProfit: number | null;
    remainingMaxDrawdownPercent: number;
    openTrades: number | null;
    lastVpsHeartbeat: string | null;
  };
  payouts: {
    profitEligible: boolean;
    lastPayout: { amount: number; status: string; requestedAt: string } | null;
    pendingPayoutAmount: number;
    totalPaid: number;
    currentCycleStart: string | null;
  };
  risk: {
    ruleViolationsCount: number;
    drawdownUsedPercent: number;
    riskScore: HealthScore;
    latestAlert: string | null;
  };
  adminNotes: string;
  timeline: WorkflowStep[];
  historicalCycleCount: number;
  fundedChallengeId: string;
  originalChallengeId: string | null;
  userId: string;
}

export interface LiveMonitoring {
  onlineAccounts: number;
  offlineAccounts: number;
  delayedHeartbeats: number;
  nearMaxDrawdown: number;
  pendingPayouts: number;
  waitingBalanceReset: number;
}

export interface FundedChartData {
  bySize: { size: string; count: number }[];
  profitDistribution: { bucket: string; count: number }[];
  profitVsDrawdown: { name: string; value: number }[];
  monthlyPayouts: { month: string; total: number }[];
  payoutHistory30Days: { date: string; total: number }[];
}

const NEAR_BREACH_THRESHOLD = 75;
const STALE_SYNC_SECONDS = 60;

function computeDrawdownUsedPercent(peakClosedBalance: number | null, equity: number | null, accountSize: number | null, drawdownLimit: number): number {
  if (peakClosedBalance === null || equity === null || accountSize === null) return 0;
  const fixedAllowedLoss = accountSize * (drawdownLimit / 100);
  if (fixedAllowedLoss <= 0) return 0;
  const used = Math.max(0, peakClosedBalance - equity);
  return Math.min(100, Math.round((used / fixedAllowedLoss) * 100));
}

function computeProfitPercent(balance: number | null, accountSize: number | null): number {
  if (balance === null || accountSize === null || accountSize === 0) return 0;
  return Math.round(((balance - accountSize) / accountSize) * 1000) / 10;
}

function computeLiveStatus(isStale: boolean, drawdownUsedPercent: number): LiveStatusColor {
  // Matches the precedent set for Active Traders: "breached" isn't a
  // reachable state here either — a funded account that fails leaves
  // 'active' status entirely and disappears from this dataset.
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

async function getPayoutStatusMap(serviceClient: ReturnType<typeof createServiceClient>, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, PayoutStatus>();
  const query = await serviceClient
    .from("payout_requests")
    .select("user_id, status, requested_at")
    .in("user_id", userIds)
    .order("requested_at", { ascending: false });

  const rows = (query.data as { user_id: string; status: string; requested_at: string }[]) ?? [];
  const map = new Map<string, PayoutStatus>();
  for (const r of rows) {
    if (!map.has(r.user_id)) {
      map.set(r.user_id, r.status === "pending" ? "pending" : r.status === "approved" ? "approved" : r.status === "rejected" ? "rejected" : "none");
    }
  }
  return map;
}

export async function getFundedTraderStats(): Promise<FundedTraderStats> {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("id, peak_closed_balance, last_known_balance, last_known_equity, last_known_check_at, drawdown_limit, trading_account_id")
    .eq("status", "active")
    .eq("current_phase", 3);

  const rows = (query.data as any[]) ?? [];
  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  let totalCapital = 0, profitable = 0, nearDrawdown = 0, totalProfitPercent = 0;

  for (const r of rows) {
    const size = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    if (size !== null) totalCapital += size;
    if (size !== null && r.last_known_balance !== null && r.last_known_balance > size) profitable++;
    const usedPercent = computeDrawdownUsedPercent(r.peak_closed_balance, r.last_known_equity, size, r.drawdown_limit);
    if (usedPercent >= NEAR_BREACH_THRESHOLD) nearDrawdown++;
    totalProfitPercent += computeProfitPercent(r.last_known_balance, size);
  }

  const pendingQuery = await serviceClient.from("payout_requests").select("id", { count: "exact", head: true }).eq("status", "pending");

  return {
    activeFundedTraders: rows.length,
    totalFundedCapital: totalCapital,
    currentlyProfitable: profitable,
    nearMaxDrawdown: nearDrawdown,
    pendingPayoutRequests: pendingQuery.count ?? 0,
    avgProfitThisMonthPercent: rows.length > 0 ? Math.round((totalProfitPercent / rows.length) * 10) / 10 : 0,
  };
}

export async function getFundedTradersPage(params: {
  search?: string;
  filters?: { accountSize?: string; country?: string; vpsSlot?: string; riskLevel?: string; payoutStatus?: string; status?: string };
  page: number;
  pageSize: number;
}): Promise<FundedTraderListResult> {
  const serviceClient = createServiceClient();
  const { search, filters = {}, page, pageSize } = params;

  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const term = search.trim();
    const usersQuery = await serviceClient.from("users").select("id").or(`email.ilike.%${term}%,username.ilike.%${term}%,full_name.ilike.%${term}%`);
    matchingUserIds = (usersQuery.data as { id: string }[] ?? []).map((u) => u.id);
  }

  let query = serviceClient.from("user_challenges").select("*").eq("status", "active").eq("current_phase", 3);

  if (search && search.trim()) {
    const term = search.trim();
    const orParts = [`account_login.ilike.%${term}%`];
    if (matchingUserIds && matchingUserIds.length > 0) orParts.push(`user_id.in.(${matchingUserIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

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

  const challengeIds = rows.map((r) => r.id);
  const lastTradeQuery = challengeIds.length > 0
    ? await serviceClient.from("recorded_trades").select("user_challenge_id, close_time").in("user_challenge_id", challengeIds).order("close_time", { ascending: false })
    : { data: [] as any[] };
  const lastTradeByChallenge = new Map<string, string>();
  for (const t of (lastTradeQuery.data as any[]) ?? []) {
    if (!lastTradeByChallenge.has(t.user_challenge_id)) lastTradeByChallenge.set(t.user_challenge_id, t.close_time);
  }

  const payoutStatusMap = await getPayoutStatusMap(serviceClient, userIds);

  let enriched: FundedTraderRow[] = rows.map((r) => {
    const user = usersById.get(r.user_id);
    const accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    const usedPercent = computeDrawdownUsedPercent(r.peak_closed_balance, r.last_known_equity, accountSize, r.drawdown_limit);
    const profitPercent = computeProfitPercent(r.last_known_balance, accountSize);
    const isStale = !r.last_known_check_at || (Date.now() - new Date(r.last_known_check_at).getTime()) > STALE_SYNC_SECONDS * 1000;
    const hasWarnings = r.hold_time_warnings_notified > 0 || r.drawdown_warning_sent || r.weekend_hold_warnings > 0;
    const floatingPL = r.last_known_equity !== null && r.last_known_balance !== null ? r.last_known_equity - r.last_known_balance : null;

    return {
      id: r.id,
      email: user?.email ?? "unknown",
      full_name: user?.full_name ?? null,
      username: user?.username ?? null,
      country: user?.country ?? null,
      account_login: r.account_login,
      accountSize,
      balance: r.last_known_balance,
      equity: r.last_known_equity,
      floatingPL,
      profitPercent,
      drawdownUsedPercent: usedPercent,
      status: computeLiveStatus(isStale, usedPercent),
      lastSync: r.last_known_check_at,
      openTrades: r.last_known_open_trades,
      lastActivity: lastTradeByChallenge.get(r.id) ?? null,
      vpsSlot: slotByChallenge.get(r.id) ?? null,
      payoutStatus: payoutStatusMap.get(r.user_id) ?? "none",
      healthScore: computeHealthScore(isStale, usedPercent, hasWarnings),
    };
  });

  if (filters.accountSize) enriched = enriched.filter((t) => t.accountSize === Number(filters.accountSize));
  if (filters.country) enriched = enriched.filter((t) => t.country === filters.country);
  if (filters.vpsSlot) enriched = enriched.filter((t) => t.vpsSlot === filters.vpsSlot);
  if (filters.riskLevel) enriched = enriched.filter((t) => t.healthScore === filters.riskLevel);
  if (filters.payoutStatus) enriched = enriched.filter((t) => t.payoutStatus === filters.payoutStatus);
  if (filters.status === "near_breach") enriched = enriched.filter((t) => t.status === "near_drawdown");
  else if (filters.status === "delayed") enriched = enriched.filter((t) => t.status === "delayed");
  else if (filters.status === "online") enriched = enriched.filter((t) => t.status === "online");

  const totalCount = enriched.length;
  const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);

  return { traders: pageItems, totalCount };
}

export async function getFundedTraderDetail(challengeId: string): Promise<FundedTraderDetail | null> {
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("*").eq("id", challengeId).single();
  const challenge = challengeQuery.data as any;
  if (challengeQuery.error || !challenge) return null;

  const userQuery = await serviceClient.from("users").select("id, email, full_name, username, country, phone").eq("id", challenge.user_id).single();
  const user = userQuery.data as any;

  const accountQuery = challenge.trading_account_id
    ? await serviceClient.from("trading_accounts").select("account_size").eq("id", challenge.trading_account_id).single()
    : { data: null };
  const accountSize = (accountQuery.data as any)?.account_size ?? null;

  const slotQuery = await serviceClient.from("vps_slots").select("slot_label").eq("current_user_challenge_id", challengeId).maybeSingle();
  const vpsSlot = (slotQuery.data as { slot_label: string } | null)?.slot_label ?? null;

  // Find the original evaluation challenge this funded account came
  // from — same proven timing-match technique used for Users' journey
  // grouping, since no direct foreign key links them.
  const originalQuery = await serviceClient
    .from("user_challenges")
    .select("id, challenge_id, trading_account_id")
    .eq("user_id", challenge.user_id)
    .eq("status", "passed")
    .lte("completed_at", challenge.created_at)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const originalChallenge = originalQuery.data as any;
  const originalSizeQuery = originalChallenge?.trading_account_id
    ? await serviceClient.from("trading_accounts").select("account_size").eq("id", originalChallenge.trading_account_id).single()
    : { data: null };
  const originalSize = (originalSizeQuery.data as any)?.account_size ?? null;

  const payoutsQuery = await serviceClient
    .from("payout_requests")
    .select("amount, status, requested_at, processed_at")
    .eq("user_id", challenge.user_id)
    .gte("requested_at", challenge.created_at)
    .order("requested_at", { ascending: true });
  const payouts = (payoutsQuery.data as { amount: number; status: string; requested_at: string; processed_at: string | null }[]) ?? [];

  const approvedPayouts = payouts.filter((p) => p.status === "approved" || p.status === "completed");
  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const totalPaid = approvedPayouts.reduce((s, p) => s + Number(p.amount), 0);
  const pendingAmount = pendingPayouts.reduce((s, p) => s + Number(p.amount), 0);
  const lastPayout = payouts[payouts.length - 1] ?? null;

  const lastReset = approvedPayouts.filter((p) => p.processed_at).sort((a, b) => new Date(b.processed_at!).getTime() - new Date(a.processed_at!).getTime())[0];
  const currentCycleStart = lastReset?.processed_at ?? challenge.created_at;

  const usedPercent = computeDrawdownUsedPercent(challenge.peak_closed_balance, challenge.last_known_equity, accountSize, challenge.drawdown_limit);
  const isStale = !challenge.last_known_check_at || (Date.now() - new Date(challenge.last_known_check_at).getTime()) > STALE_SYNC_SECONDS * 1000;
  const hasWarnings = challenge.hold_time_warnings_notified > 0 || challenge.drawdown_warning_sent || challenge.weekend_hold_warnings > 0;

  let latestAlert: string | null = null;
  if (challenge.drawdown_warning_sent) latestAlert = `Drawdown warning (15%) — ${challenge.drawdown_warning_sent_at ? new Date(challenge.drawdown_warning_sent_at).toLocaleString() : "date unknown"}`;
  else if (challenge.hold_time_warnings_notified > 0) latestAlert = `Hold-time warning ${challenge.hold_time_warnings_notified}/3`;
  else if (challenge.weekend_hold_warnings > 0) latestAlert = `Weekend-holding warning ${challenge.weekend_hold_warnings}/1`;

  const hasRequestedPayout = payouts.length > 0;
  const hasApprovedPayout = approvedPayouts.length > 0;
  const hasReset = !!lastReset;

  const timeline: WorkflowStep[] = [
    { label: "Funded", timestamp: challenge.created_at, reached: true },
    { label: "Trading Active", timestamp: challenge.last_known_check_at, reached: !!challenge.last_known_check_at },
    { label: "Profit Accumulating", timestamp: null, reached: challenge.last_known_balance !== null && accountSize !== null && challenge.last_known_balance > accountSize },
    { label: "Payout Requested", timestamp: lastPayout?.requested_at ?? null, reached: hasRequestedPayout },
    { label: "Payout Approved", timestamp: hasApprovedPayout ? approvedPayouts[approvedPayouts.length - 1].requested_at : null, reached: hasApprovedPayout },
    { label: "Balance Reset", timestamp: lastReset?.processed_at ?? null, reached: hasReset },
    { label: "New Trading Cycle Started", timestamp: lastReset?.processed_at ?? null, reached: hasReset, current: hasReset },
  ];

  return {
    customer: { name: user?.full_name ?? null, email: user?.email ?? "unknown", username: user?.username ?? null, country: user?.country ?? null, phone: user?.phone ?? null },
    funding: {
      originalChallengeSize: originalSize,
      fundedDate: challenge.created_at,
      fundedAccountSize: accountSize,
      currentStage: "Funded",
      profitSplit: Number(challenge.profit_split),
      currentCycleNumber: approvedPayouts.length + 1,
    },
    tradingAccount: {
      mt5Login: challenge.account_login,
      server: challenge.account_server,
      vpsSlot,
      balance: challenge.last_known_balance,
      equity: challenge.last_known_equity,
      floatingPL: challenge.last_known_equity !== null && challenge.last_known_balance !== null ? challenge.last_known_equity - challenge.last_known_balance : null,
      highestEquity: challenge.peak_closed_balance,
      currentProfit: challenge.last_known_balance !== null && accountSize !== null ? challenge.last_known_balance - accountSize : null,
      remainingMaxDrawdownPercent: 100 - usedPercent,
      openTrades: challenge.last_known_open_trades,
      lastVpsHeartbeat: challenge.last_known_check_at,
    },
    payouts: {
      profitEligible: !!challenge.payout_eligible,
      lastPayout: lastPayout ? { amount: Number(lastPayout.amount), status: lastPayout.status, requestedAt: lastPayout.requested_at } : null,
      pendingPayoutAmount: pendingAmount,
      totalPaid,
      currentCycleStart,
    },
    risk: {
      ruleViolationsCount: (challenge.hold_time_warnings_notified ?? 0) + (challenge.weekend_hold_warnings ?? 0) + (challenge.drawdown_warning_sent ? 1 : 0),
      drawdownUsedPercent: usedPercent,
      riskScore: computeHealthScore(isStale, usedPercent, hasWarnings),
      latestAlert,
    },
    adminNotes: "Not implemented yet — no admin notes system exists.",
    timeline,
    historicalCycleCount: approvedPayouts.length,
    fundedChallengeId: challenge.id,
    originalChallengeId: originalChallenge?.id ?? null,
    userId: challenge.user_id,
  };
}

export async function getLiveMonitoring(): Promise<LiveMonitoring> {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("id, peak_closed_balance, last_known_equity, last_known_check_at, drawdown_limit, trading_account_id")
    .eq("status", "active")
    .eq("current_phase", 3);
  const rows = (query.data as any[]) ?? [];

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  let online = 0, offline = 0, delayed = 0, nearDrawdown = 0;

  for (const r of rows) {
    const size = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    const usedPercent = computeDrawdownUsedPercent(r.peak_closed_balance, r.last_known_equity, size, r.drawdown_limit);
    if (usedPercent >= NEAR_BREACH_THRESHOLD) nearDrawdown++;

    if (!r.last_known_check_at) {
      offline++;
    } else {
      const secondsSince = (Date.now() - new Date(r.last_known_check_at).getTime()) / 1000;
      if (secondsSince > 300) offline++;
      else if (secondsSince > STALE_SYNC_SECONDS) delayed++;
      else online++;
    }
  }

  const pendingQuery = await serviceClient.from("payout_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
  const approvedQuery = await serviceClient.from("payout_requests").select("id", { count: "exact", head: true }).eq("status", "approved");

  // "Accounts Currently Resetting" is deliberately omitted — same
  // reasoning applied to Active Traders' "breached/retired" states:
  // a funded account's trading_accounts.status never actually
  // becomes 'resetting' during a normal payout cycle, only a truly
  // failed/retired account gets manually flipped that way, and those
  // leave this active-funded dataset entirely.
  return {
    onlineAccounts: online,
    offlineAccounts: offline,
    delayedHeartbeats: delayed,
    nearMaxDrawdown: nearDrawdown,
    pendingPayouts: pendingQuery.count ?? 0,
    waitingBalanceReset: approvedQuery.count ?? 0,
  };
}

export async function getFundedCharts(): Promise<FundedChartData> {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("id, last_known_balance, peak_closed_balance, last_known_equity, drawdown_limit, trading_account_id")
    .eq("status", "active")
    .eq("current_phase", 3);
  const rows = (query.data as any[]) ?? [];

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  const sizeCounts = new Map<number, number>();
  const profitBuckets = { "< 0%": 0, "0-5%": 0, "5-10%": 0, "10%+": 0 };
  let inProfit = 0, inDrawdown = 0, flat = 0;

  for (const r of rows) {
    const size = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    if (size !== null) sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);

    const profitPercent = computeProfitPercent(r.last_known_balance, size);
    if (profitPercent < 0) profitBuckets["< 0%"]++;
    else if (profitPercent < 5) profitBuckets["0-5%"]++;
    else if (profitPercent < 10) profitBuckets["5-10%"]++;
    else profitBuckets["10%+"]++;

    if (size !== null && r.last_known_balance !== null) {
      if (r.last_known_balance > size) inProfit++;
      else if (r.last_known_balance < size) inDrawdown++;
      else flat++;
    }
  }

  const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const payoutsQuery = await serviceClient
    .from("payout_requests")
    .select("amount, requested_at, status")
    .in("status", ["approved", "completed"])
    .gte("requested_at", since30Days);
  const payoutRows = (payoutsQuery.data as { amount: number; requested_at: string }[]) ?? [];

  const dayTotals = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayTotals.set(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10), 0);
  }
  for (const p of payoutRows) {
    const key = new Date(Date.UTC(new Date(p.requested_at).getUTCFullYear(), new Date(p.requested_at).getUTCMonth(), new Date(p.requested_at).getUTCDate())).toISOString().slice(0, 10);
    if (dayTotals.has(key)) dayTotals.set(key, (dayTotals.get(key) ?? 0) + Number(p.amount));
  }

  const since6Months = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  const monthlyPayoutsQuery = await serviceClient
    .from("payout_requests")
    .select("amount, requested_at")
    .in("status", ["approved", "completed"])
    .gte("requested_at", since6Months);
  const monthlyRows = (monthlyPayoutsQuery.data as { amount: number; requested_at: string }[]) ?? [];

  const monthTotals = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    monthTotals.set(key, 0);
  }
  for (const p of monthlyRows) {
    const d = new Date(p.requested_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (monthTotals.has(key)) monthTotals.set(key, (monthTotals.get(key) ?? 0) + Number(p.amount));
  }

  return {
    bySize: [...sizeCounts.entries()].sort((a, b) => a[0] - b[0]).map(([size, count]) => ({ size: `₦${size.toLocaleString()}`, count })),
    profitDistribution: Object.entries(profitBuckets).map(([bucket, count]) => ({ bucket, count })),
    profitVsDrawdown: [
      { name: "In Profit", value: inProfit },
      { name: "In Drawdown", value: inDrawdown },
      { name: "Flat", value: flat },
    ],
    monthlyPayouts: [...monthTotals.entries()].map(([month, total]) => ({ month, total })),
    payoutHistory30Days: [...dayTotals.entries()].map(([date, total]) => ({ date, total })),
  };
}
