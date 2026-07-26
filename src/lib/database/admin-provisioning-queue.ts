import { createServiceClient } from "@/lib/supabase/service";

export type QueueStatus = "Waiting" | "Completed" | "Failed" | "Cancelled";

export interface QueueStats {
  waitingCount: number;
  completedToday: number;
  failedToday: number;
  avgProvisionSeconds: number;
  availableInventory: number;
}

export interface QueueRow {
  challengeId: string;
  email: string;
  fullName: string | null;
  accountSize: number | null;
  phase: number;
  purchaseReference: string | null;
  paymentStatus: string | null;
  queueStatus: QueueStatus;
  assignedLogin: string | null;
  assignedServer: string | null;
  createdAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  queuePosition: number | null;
  availableForSize: number;
}

export interface TimelineStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
}

export interface QueueDetail {
  customer: { name: string | null; email: string; country: string | null };
  purchaseReference: string | null;
  challengeSize: number | null;
  assignedAccount: { login: string | null; server: string | null; stage: string } | null;
  timeline: TimelineStep[];
  queueWaitSeconds: number;
  provisionDurationSeconds: number | null;
  queueStatus: QueueStatus;
}

export interface QueueAnalytics {
  provisionTimeToday: number;
  successRatePercent: number;
  avgQueueTimeSeconds: number;
  currentQueueLength: number;
  inventoryUsedToday: number;
}

function extractSize(challengeConfigId: string): number | null {
  const match = challengeConfigId.match(/(\d+)k/i);
  return match ? Number(match[1]) * 1000 : null;
}

async function matchPurchase(serviceClient: ReturnType<typeof createServiceClient>, userId: string, createdAt: string) {
  const query = await serviceClient
    .from("challenge_purchases")
    .select("id, payment_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  const rows = ((query.data ?? []) as unknown as { id: string; payment_status: string; created_at: string }[]);
  return rows.find((p) => new Date(p.created_at) <= new Date(createdAt)) ?? rows[rows.length - 1] ?? null;
}

export async function getQueueStats(): Promise<QueueStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const waitingQuery = await serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "awaiting_allocation");

  const completedQuery = await serviceClient
    .from("trading_accounts")
    .select("assigned_at")
    .not("assigned_at", "is", null)
    .gte("assigned_at", todayStart);
  const completedRows = ((completedQuery.data ?? []) as unknown as { assigned_at: string }[]);

  const failedQuery = await serviceClient
    .from("user_challenges")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .is("trading_account_id", null)
    .gte("completed_at", todayStart);

  const availableQuery = await serviceClient.from("trading_accounts").select("id", { count: "exact", head: true }).eq("status", "available");

  // Average provision duration — real, using the same-row timing
  // (challenge created_at -> the linked account's assigned_at), not a
  // fabricated multi-stage estimate.
  const recentAssignedQuery = await serviceClient
    .from("trading_accounts")
    .select("id, assigned_at")
    .not("assigned_at", "is", null)
    .order("assigned_at", { ascending: false })
    .limit(50);
  const recentAccounts = ((recentAssignedQuery.data ?? []) as unknown as { id: string; assigned_at: string }[]);
  const accountIds = recentAccounts.map((a) => a.id);
  const linkedChallengesQuery = accountIds.length > 0
    ? await serviceClient.from("user_challenges").select("trading_account_id, created_at").in("trading_account_id", accountIds)
    : { data: [] as any[] };
  const createdByAccount = new Map(((linkedChallengesQuery.data ?? []) as unknown as any[]).map((c) => [c.trading_account_id, c.created_at]));

  let totalDuration = 0, durationCount = 0;
  for (const a of recentAccounts) {
    const createdAt = createdByAccount.get(a.id);
    if (createdAt) {
      const duration = (new Date(a.assigned_at).getTime() - new Date(createdAt).getTime()) / 1000;
      if (duration >= 0) {
        totalDuration += duration;
        durationCount++;
      }
    }
  }

  return {
    waitingCount: waitingQuery.count ?? 0,
    completedToday: completedRows.length,
    failedToday: failedQuery.count ?? 0,
    avgProvisionSeconds: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    availableInventory: availableQuery.count ?? 0,
  };
}

export async function getQueue(): Promise<QueueRow[]> {
  const serviceClient = createServiceClient();

  const waitingQuery = await serviceClient
    .from("user_challenges")
    .select("id, user_id, challenge_id, current_phase, created_at")
    .eq("status", "awaiting_allocation")
    .order("created_at", { ascending: true });
  const waitingRows = ((waitingQuery.data ?? []) as unknown as any[]);

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const recentQuery = await serviceClient
    .from("user_challenges")
    .select("id, user_id, challenge_id, current_phase, created_at, completed_at, trading_account_id, status")
    .gte("created_at", todayStart)
    .in("status", ["active", "passed", "failed"])
    .order("created_at", { ascending: false })
    .limit(50);
  const recentRows = ((recentQuery.data ?? []) as unknown as any[]);

  const allUserIds = [...new Set([...waitingRows, ...recentRows].map((r) => r.user_id))];
  const usersQuery = allUserIds.length > 0 ? await serviceClient.from("users").select("id, email, full_name").in("id", allUserIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  const accountIds = [...new Set(recentRows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, login, server, account_size, assigned_at").in("id", accountIds)
    : { data: [] as any[] };
  const accountById = new Map(((accountsQuery.data ?? []) as unknown as any[]).map((a) => [a.id, a]));

  const allSizes = [...new Set(waitingRows.map((r) => extractSize(r.challenge_id)).filter((s): s is number => s !== null))];
  const availableQuery = allSizes.length > 0
    ? await serviceClient.from("trading_accounts").select("account_size").in("account_size", allSizes).eq("status", "available")
    : { data: [] as any[] };
  const availByCount = new Map<number, number>();
  for (const a of ((availableQuery.data ?? []) as unknown as { account_size: number }[])) {
    availByCount.set(a.account_size, (availByCount.get(a.account_size) ?? 0) + 1);
  }

  const rows: QueueRow[] = [];

  for (let i = 0; i < waitingRows.length; i++) {
    const r = waitingRows[i];
    const user = userById.get(r.user_id);
    const purchase = await matchPurchase(serviceClient, r.user_id, r.created_at);
    const size = extractSize(r.challenge_id);
    rows.push({
      challengeId: r.id,
      email: user?.email ?? "unknown",
      fullName: user?.full_name ?? null,
      accountSize: size,
      phase: r.current_phase,
      purchaseReference: purchase?.id ?? null,
      paymentStatus: purchase?.payment_status ?? null,
      queueStatus: "Waiting",
      assignedLogin: null,
      assignedServer: null,
      createdAt: r.created_at,
      completedAt: null,
      durationSeconds: null,
      queuePosition: i + 1,
      availableForSize: size !== null ? availByCount.get(size) ?? 0 : 0,
    });
  }

  for (const r of recentRows) {
    if (!r.trading_account_id && r.status !== "failed") continue;
    const user = userById.get(r.user_id);
    const purchase = await matchPurchase(serviceClient, r.user_id, r.created_at);
    const account = r.trading_account_id ? accountById.get(r.trading_account_id) : null;

    let queueStatus: QueueStatus = "Completed";
    if (!account) queueStatus = "Failed";

    rows.push({
      challengeId: r.id,
      email: user?.email ?? "unknown",
      fullName: user?.full_name ?? null,
      accountSize: account?.account_size ?? null,
      phase: r.current_phase,
      purchaseReference: purchase?.id ?? null,
      paymentStatus: purchase?.payment_status ?? null,
      queueStatus,
      assignedLogin: account?.login ?? null,
      assignedServer: account?.server ?? null,
      createdAt: r.created_at,
      completedAt: account?.assigned_at ?? r.completed_at ?? null,
      durationSeconds: account?.assigned_at ? Math.round((new Date(account.assigned_at).getTime() - new Date(r.created_at).getTime()) / 1000) : null,
      queuePosition: null,
      availableForSize: 0,
    });
  }

  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getQueueDetail(challengeId: string): Promise<QueueDetail | null> {
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("*").eq("id", challengeId).single();
  const challenge = challengeQuery.data as any;
  if (challengeQuery.error || !challenge) return null;

  const userQuery = await serviceClient.from("users").select("full_name, email, country").eq("id", challenge.user_id).single();
  const user = userQuery.data as { full_name: string | null; email: string; country: string | null } | null;

  const purchase = await matchPurchase(serviceClient, challenge.user_id, challenge.created_at);

  let assignedAccount: QueueDetail["assignedAccount"] = null;
  let accountAssignedAt: string | null = null;

  if (challenge.trading_account_id) {
    const accountQuery = await serviceClient.from("trading_accounts").select("login, server, account_size, status, assigned_at").eq("id", challenge.trading_account_id).single();
    const account = accountQuery.data as any;
    if (account) {
      assignedAccount = { login: account.login, server: account.server, stage: challenge.current_phase === 3 ? "Funded" : `Phase ${challenge.current_phase}` };
      accountAssignedAt = account.assigned_at;
    }
  }

  const queueStatus: QueueStatus = challenge.status === "awaiting_allocation" ? "Waiting" : assignedAccount ? "Completed" : "Failed";

  const timeline: TimelineStep[] = [
    { label: "Payment Confirmed", timestamp: purchase?.payment_status === "completed" ? purchase.created_at : null, reached: purchase?.payment_status === "completed" },
    { label: "Queue Created", timestamp: challenge.created_at, reached: true },
    { label: "Inventory Assigned", timestamp: accountAssignedAt, reached: !!assignedAccount },
    { label: "Credentials Sent", timestamp: accountAssignedAt, reached: !!assignedAccount },
    { label: "Completed", timestamp: accountAssignedAt, reached: !!assignedAccount },
  ];

  const queueWaitSeconds = Math.round((Date.now() - new Date(challenge.created_at).getTime()) / 1000);
  const provisionDurationSeconds = accountAssignedAt ? Math.round((new Date(accountAssignedAt).getTime() - new Date(challenge.created_at).getTime()) / 1000) : null;

  return {
    customer: { name: user?.full_name ?? null, email: user?.email ?? "unknown", country: user?.country ?? null },
    purchaseReference: purchase?.id ?? null,
    challengeSize: assignedAccount ? null : extractSize(challenge.challenge_id),
    assignedAccount,
    timeline,
    queueWaitSeconds,
    provisionDurationSeconds,
    queueStatus,
  };
}

export async function getQueueAnalytics(): Promise<QueueAnalytics> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const stats = await getQueueStats();

  const totalTodayQuery = await serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).gte("created_at", todayStart);

  const successRate = (stats.completedToday + stats.failedToday) > 0
    ? Math.round((stats.completedToday / (stats.completedToday + stats.failedToday)) * 100)
    : 100;

  const usedTodayQuery = await serviceClient.from("trading_accounts").select("id", { count: "exact", head: true }).eq("status", "assigned").gte("assigned_at", todayStart);

  return {
    provisionTimeToday: stats.avgProvisionSeconds,
    successRatePercent: successRate,
    avgQueueTimeSeconds: stats.avgProvisionSeconds,
    currentQueueLength: stats.waitingCount,
    inventoryUsedToday: usedTodayQuery.count ?? 0,
  };
}
