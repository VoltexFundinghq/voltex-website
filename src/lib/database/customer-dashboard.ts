import { createServiceClient } from "@/lib/supabase/service";

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

export interface DashboardSummary {
  hasActiveChallenge: boolean;
  challengeLabel: string;
  currentPhase: number | null;
  accountLogin: string | null;
  currentEquity: number | null;
  profitTargetProgressPercent: number;
  overallDrawdownRemainingPercent: number;
}

export interface CurrentChallengeCard {
  challengeSize: number | null;
  phase: number;
  status: string;
  purchaseDate: string | null;
  tradingStarted: string | null;
  balance: number | null;
  equity: number | null;
  profit: number | null;
  profitPercent: number;
  profitTargetPercent: number;
  profitTargetProgressPercent: number;
  maxDrawdownPercent: number;
  overallDrawdownRemainingPercent: number;
  accountLogin: string | null;
}

export interface ActivityEvent {
  text: string;
  timestamp: string;
}

async function matchPurchase(serviceClient: ReturnType<typeof createServiceClient>, userId: string, referenceDate: string) {
  const query = await serviceClient.from("challenge_purchases").select("created_at").eq("user_id", userId).order("created_at", { ascending: false });
  const rows = ((query.data ?? []) as unknown as { created_at: string }[]);
  return rows.find((p) => new Date(p.created_at) <= new Date(referenceDate)) ?? rows[rows.length - 1] ?? null;
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient
    .from("user_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("current_phase", { ascending: false })
    .limit(1)
    .maybeSingle();
  const challenge = challengeQuery.data as any;

  if (!challenge) {
    return { hasActiveChallenge: false, challengeLabel: "No Active Challenge", currentPhase: null, accountLogin: null, currentEquity: null, profitTargetProgressPercent: 0, overallDrawdownRemainingPercent: 100 };
  }

  const accountQuery = challenge.trading_account_id
    ? await serviceClient.from("trading_accounts").select("account_size").eq("id", challenge.trading_account_id).single()
    : { data: null };
  const accountSize = (accountQuery.data as any)?.account_size ?? null;

  const usedPercent = computeDrawdownUsedPercent(challenge.peak_closed_balance, challenge.last_known_equity, accountSize, challenge.drawdown_limit);
  const progressPercent = computeProfitTargetProgress(challenge.last_known_balance, accountSize, challenge.profit_target);

  return {
    hasActiveChallenge: true,
    challengeLabel: challenge.current_phase === 3 ? "Funded" : `Phase ${challenge.current_phase}`,
    currentPhase: challenge.current_phase,
    accountLogin: challenge.account_login,
    currentEquity: challenge.last_known_equity,
    profitTargetProgressPercent: progressPercent,
    overallDrawdownRemainingPercent: 100 - usedPercent,
  };
}

export async function getCurrentChallengeCard(userId: string): Promise<CurrentChallengeCard | null> {
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient
    .from("user_challenges")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("current_phase", { ascending: false })
    .limit(1)
    .maybeSingle();
  const challenge = challengeQuery.data as any;
  if (!challenge) return null;

  const accountQuery = challenge.trading_account_id
    ? await serviceClient.from("trading_accounts").select("account_size").eq("id", challenge.trading_account_id).single()
    : { data: null };
  const accountSize = (accountQuery.data as any)?.account_size ?? null;

  const purchase = await matchPurchase(serviceClient, userId, challenge.created_at);
  const usedPercent = computeDrawdownUsedPercent(challenge.peak_closed_balance, challenge.last_known_equity, accountSize, challenge.drawdown_limit);
  const progressPercent = computeProfitTargetProgress(challenge.last_known_balance, accountSize, challenge.profit_target);
  const profit = challenge.last_known_balance !== null && accountSize !== null ? challenge.last_known_balance - accountSize : null;
  const profitPercent = profit !== null && accountSize ? Math.round((profit / accountSize) * 1000) / 10 : 0;

  return {
    challengeSize: accountSize,
    phase: challenge.current_phase,
    status: challenge.current_phase === 3 ? "Funded" : `Phase ${challenge.current_phase}`,
    purchaseDate: purchase?.created_at ?? null,
    tradingStarted: challenge.start_date ?? challenge.created_at,
    balance: challenge.last_known_balance,
    equity: challenge.last_known_equity,
    profit,
    profitPercent,
    profitTargetPercent: Number(challenge.profit_target),
    profitTargetProgressPercent: progressPercent,
    maxDrawdownPercent: Number(challenge.drawdown_limit),
    overallDrawdownRemainingPercent: 100 - usedPercent,
    accountLogin: challenge.account_login,
  };
}

export interface ChallengeCard {
  id: string;
  challengeSize: number | null;
  phase: number;
  status: string;
  purchaseDate: string | null;
  currentProfit: number | null;
  currentEquity: number | null;
  profitTargetProgressPercent: number;
  accountLogin: string | null;
}

export async function getMyChallenges(userId: string): Promise<ChallengeCard[]> {
  const serviceClient = createServiceClient();

  const query = await serviceClient.from("user_challenges").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  const rows = ((query.data ?? []) as unknown as any[]);
  if (rows.length === 0) return [];

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0 ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds) : { data: [] as any[] };
  const sizeById = new Map(((accountsQuery.data ?? []) as unknown as any[]).map((a) => [a.id, a.account_size]));

  return Promise.all(rows.map(async (r) => {
    const accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    const purchase = await matchPurchase(serviceClient, userId, r.created_at);
    const progressPercent = computeProfitTargetProgress(r.last_known_balance, accountSize, r.profit_target);
    const profit = r.last_known_balance !== null && accountSize !== null ? r.last_known_balance - accountSize : null;

    let status = r.status === "active" ? (r.current_phase === 3 ? "Funded" : `Phase ${r.current_phase}`) : r.status === "passed" ? "Passed" : "Failed";

    return {
      id: r.id,
      challengeSize: accountSize,
      phase: r.current_phase,
      status,
      purchaseDate: purchase?.created_at ?? null,
      currentProfit: profit,
      currentEquity: r.last_known_equity,
      profitTargetProgressPercent: progressPercent,
      accountLogin: r.account_login,
    };
  }));
}

export interface TradingAccountCard {
  id: string;
  mt5Login: string | null;
  server: string | null;
  challengeSize: number | null;
  phase: number;
  status: string;
  balance: number | null;
  equity: number | null;
  lastSync: string | null;
  isRetired: boolean;
  retiredReason: string | null;
}

export async function getMyTradingAccounts(userId: string): Promise<TradingAccountCard[]> {
  const serviceClient = createServiceClient();

  const query = await serviceClient.from("user_challenges").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  const rows = ((query.data ?? []) as unknown as any[]);
  if (rows.length === 0) return [];

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0 ? await serviceClient.from("trading_accounts").select("id, account_size, server, status").in("id", accountIds) : { data: [] as any[] };
  const accountById = new Map(((accountsQuery.data ?? []) as unknown as any[]).map((a) => [a.id, a]));

  return rows.filter((r) => r.trading_account_id).map((r) => {
    const account = accountById.get(r.trading_account_id);
    const isRetired = r.status === "passed" || r.status === "failed";
    const retiredReason = r.status === "passed" ? (r.current_phase === 3 ? "Moved to Funded" : "Passed — Awaiting Funding") : r.status === "failed" ? "Failed" : null;

    return {
      id: r.id,
      mt5Login: r.account_login,
      server: account?.server ?? null,
      challengeSize: account?.account_size ?? null,
      phase: r.current_phase,
      status: r.status === "active" ? (r.current_phase === 3 ? "Funded" : `Phase ${r.current_phase}`) : (r.status === "passed" ? "Passed" : "Failed"),
      balance: r.last_known_balance,
      equity: r.last_known_equity,
      lastSync: r.last_known_check_at,
      isRetired,
      retiredReason,
    };
  });
}

export async function getMyRecentActivity(userId: string, limit = 10): Promise<ActivityEvent[]> {
  const serviceClient = createServiceClient();
  const events: ActivityEvent[] = [];

  const purchasesQuery = await serviceClient.from("challenge_purchases").select("challenge_size, payment_status, created_at, payment_confirmed_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  for (const p of ((purchasesQuery.data ?? []) as unknown as any[])) {
    events.push({ text: `Purchased ${p.challenge_size} Challenge`, timestamp: p.created_at });
    if (p.payment_status === "completed" && p.payment_confirmed_at) events.push({ text: "Payment confirmed", timestamp: p.payment_confirmed_at });
  }

  const challengesQuery = await serviceClient.from("user_challenges").select("account_login, status, current_phase, created_at, completed_at, phase1_passed_at, trading_account_id").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  for (const c of ((challengesQuery.data ?? []) as unknown as any[])) {
    if (c.trading_account_id) {
      events.push({ text: `Account assigned — ${c.account_login}`, timestamp: c.created_at });
      events.push({ text: "Credentials sent", timestamp: c.created_at });
    }
    if (c.phase1_passed_at) events.push({ text: "Passed Phase 1", timestamp: c.phase1_passed_at });
    if (c.status === "passed" && c.completed_at) events.push({ text: "Passed Phase 2", timestamp: c.completed_at });
    if (c.current_phase === 3) events.push({ text: "Moved to Funded", timestamp: c.created_at });
  }

  const payoutsQuery = await serviceClient.from("payout_requests").select("amount, status, requested_at, processed_at").eq("user_id", userId).order("requested_at", { ascending: false }).limit(limit);
  for (const p of ((payoutsQuery.data ?? []) as unknown as any[])) {
    events.push({ text: `Requested payout of ₦${Number(p.amount).toLocaleString()}`, timestamp: p.requested_at });
    if ((p.status === "approved" || p.status === "completed") && p.processed_at) events.push({ text: "Payout completed", timestamp: p.processed_at });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}
