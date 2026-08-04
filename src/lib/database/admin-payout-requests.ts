import { createServiceClient } from "@/lib/supabase/service";

export interface PayoutStats {
  pending: number;
  approved: number;
  rejected: number;
  paid: number;
  totalValue: number;
  todaysRequests: number;
}

export interface PayoutRow {
  id: string;
  traderName: string | null;
  email: string;
  accountLogin: string | null;
  profit: number;
  requestedAmount: number;
  profitSplitPercent: number;
  status: string;
  requestedAt: string;
}

export interface PayoutDetail {
  id: string;
  trader: { name: string | null; email: string; country: string | null };
  tradingAccount: { login: string | null; server: string | null; balance: number | null; equity: number | null };
  profitBreakdown: { totalProfit: number; profitSplitPercent: number; requestedAmount: number };
  previousPayouts: { amount: number; status: string; date: string }[];
  riskCheck: { ruleViolationsCount: number; latestAlert: string | null };
  timeline: { label: string; timestamp: string | null; reached: boolean }[];
  status: string;
}

export interface PayoutAnalytics {
  averagePayout: number;
  totalPaid: number;
  largestPayout: number;
  pendingValue: number;
  averageProcessingHours: number;
}

async function findChallenge(serviceClient: ReturnType<typeof createServiceClient>, userId: string, requestedAt: string) {
  const query = await serviceClient.from("user_challenges").select("*").eq("user_id", userId).eq("current_phase", 3);
  const challenges = ((query.data ?? []) as unknown as any[]);
  return challenges.sort((a, b) => Math.abs(new Date(a.created_at).getTime() - new Date(requestedAt).getTime()) - Math.abs(new Date(b.created_at).getTime() - new Date(requestedAt).getTime()))[0] ?? null;
}

export async function getPayoutStats(): Promise<PayoutStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const query = await serviceClient.from("payout_requests").select("amount, status, requested_at");
  const rows = ((query.data ?? []) as unknown as { amount: number; status: string; requested_at: string }[]);

  return {
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    paid: rows.filter((r) => r.status === "completed").length,
    totalValue: rows.reduce((s, r) => s + Number(r.amount), 0),
    todaysRequests: rows.filter((r) => r.requested_at >= todayStart).length,
  };
}

export async function getPayoutRequestsPage(params: { search?: string; filter?: string; page: number; pageSize: number }) {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let query = serviceClient.from("payout_requests").select("*");
  if (["pending", "approved", "rejected", "completed"].includes(filter)) query = query.eq("status", filter);

  const allQuery = await query.order("requested_at", { ascending: false });
  const rows = ((allQuery.data ?? []) as unknown as any[]);

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email, full_name").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  let enriched: PayoutRow[] = [];
  for (const r of rows) {
    const user = userById.get(r.user_id);
    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      if (!(user?.email ?? "").toLowerCase().includes(term) && !(user?.full_name ?? "").toLowerCase().includes(term)) continue;
    }
    const challenge = await findChallenge(serviceClient, r.user_id, r.requested_at);
    const splitPercent = challenge ? Number(challenge.profit_split) : 80;

    enriched.push({
      id: r.id,
      traderName: user?.full_name ?? null,
      email: user?.email ?? "unknown",
      accountLogin: challenge?.account_login ?? null,
      profit: Number(r.amount),
      requestedAmount: Math.round(Number(r.amount) * (splitPercent / 100)),
      profitSplitPercent: splitPercent,
      status: r.status,
      requestedAt: r.requested_at,
    });
  }

  const totalCount = enriched.length;
  const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);
  return { payouts: pageItems, totalCount };
}

export async function getPayoutDetail(payoutId: string): Promise<PayoutDetail | null> {
  const serviceClient = createServiceClient();

  const query = await serviceClient.from("payout_requests").select("*").eq("id", payoutId).single();
  const payout = query.data as any;
  if (!payout) return null;

  const userQuery = await serviceClient.from("users").select("full_name, email, country").eq("id", payout.user_id).single();
  const user = userQuery.data as any;

  const challenge = await findChallenge(serviceClient, payout.user_id, payout.requested_at);
  const splitPercent = challenge ? Number(challenge.profit_split) : 80;

  let accountServer: string | null = null;
  if (challenge?.trading_account_id) {
    const accountQuery = await serviceClient.from("trading_accounts").select("server").eq("id", challenge.trading_account_id).single();
    accountServer = (accountQuery.data as { server: string } | null)?.server ?? null;
  }

  const previousQuery = await serviceClient.from("payout_requests").select("amount, status, requested_at").eq("user_id", payout.user_id).neq("id", payoutId).order("requested_at", { ascending: false });
  const previousPayouts = ((previousQuery.data ?? []) as unknown as { amount: number; status: string; requested_at: string }[]).map((p) => ({ amount: Number(p.amount), status: p.status, date: p.requested_at }));

  const ruleViolationsCount = challenge ? (challenge.hold_time_warnings_notified ?? 0) + (challenge.weekend_hold_warnings ?? 0) + (challenge.drawdown_warning_sent ? 1 : 0) : 0;
  let latestAlert: string | null = null;
  if (challenge?.drawdown_warning_sent) latestAlert = "Drawdown warning on record";

  const timeline = [
    { label: "Request Submitted", timestamp: payout.requested_at, reached: true },
    { label: "Approved", timestamp: payout.approved_at, reached: payout.status === "approved" || payout.status === "completed" },
    { label: "Payment Sent", timestamp: payout.processed_at, reached: payout.status === "completed" },
  ];

  return {
    id: payout.id,
    trader: { name: user?.full_name ?? null, email: user?.email ?? "unknown", country: user?.country ?? null },
    tradingAccount: { login: challenge?.account_login ?? null, server: accountServer, balance: challenge?.last_known_balance ?? null, equity: challenge?.last_known_equity ?? null },
    profitBreakdown: { totalProfit: Number(payout.amount), profitSplitPercent: splitPercent, requestedAmount: Math.round(Number(payout.amount) * (splitPercent / 100)) },
    previousPayouts,
    riskCheck: { ruleViolationsCount, latestAlert },
    timeline,
    status: payout.status,
  };
}

export async function getPayoutAnalytics(): Promise<PayoutAnalytics> {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("payout_requests").select("amount, status, requested_at, approved_at, processed_at");
  const rows = ((query.data ?? []) as unknown as any[]);

  const paid = rows.filter((r) => r.status === "completed");
  const pending = rows.filter((r) => r.status === "pending");

  const processingTimes = paid.filter((r) => r.processed_at).map((r) => (new Date(r.processed_at).getTime() - new Date(r.requested_at).getTime()) / (1000 * 60 * 60));

  return {
    averagePayout: paid.length > 0 ? Math.round(paid.reduce((s, r) => s + Number(r.amount), 0) / paid.length) : 0,
    totalPaid: paid.reduce((s, r) => s + Number(r.amount), 0),
    largestPayout: rows.length > 0 ? Math.max(...rows.map((r) => Number(r.amount))) : 0,
    pendingValue: pending.reduce((s, r) => s + Number(r.amount), 0),
    averageProcessingHours: processingTimes.length > 0 ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) : 0,
  };
}

export async function getAllPayoutsForExport() {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("payout_requests").select("*").order("requested_at", { ascending: false });
  const rows = ((query.data ?? []) as unknown as any[]);

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email, full_name").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  return rows.map((r) => {
    const user = userById.get(r.user_id);
    return {
      Requested: new Date(r.requested_at).toISOString(),
      Trader: user?.full_name ?? "",
      Email: user?.email ?? "",
      Amount: Number(r.amount),
      Status: r.status,
      "Approved By": r.approved_by ?? "",
      "Paid By": r.paid_by ?? "",
    };
  });
}
