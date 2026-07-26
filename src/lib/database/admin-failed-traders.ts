import { createServiceClient } from "@/lib/supabase/service";

const DELETION_WINDOW_DAYS = 21; // confirmed against scripts/check-deletion-countdown.js

export interface FailedTraderStats {
  totalFailed: number;
  failedToday: number;
  failedThisWeek: number;
  awaitingDeletion: number;
  avgDaysUntilDeletion: number;
  ruleViolationsToday: number;
}

export type RetirementStatus = "not_yet_reset" | "counting_down" | "likely_deleted";

export interface FailedTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  accountSize: number | null;
  failureReason: string;
  phase: number;
  failedAt: string | null;
  daysSinceFailed: number | null;
  accountLogin: string | null;
  retirementStatus: RetirementStatus;
  estimatedDeleteDate: string | null;
  daysRemaining: number | null;
}

export interface FailedTraderListResult {
  traders: FailedTraderRow[];
  totalCount: number;
}

export interface WorkflowStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  current?: boolean;
}

export interface FailedTraderDetail {
  customer: { name: string | null; email: string; username: string | null; country: string | null; phone: string | null };
  challenge: {
    challengeSize: number | null;
    purchaseDate: string | null;
    phaseReached: number;
    startingBalance: number | null;
    finalBalance: number | null;
    finalEquity: number | null;
    highestEquity: number | null;
  };
  failure: {
    reason: string;
    dailyDrawdownBreached: boolean; // always false — no such rule exists
    maxDrawdownBreached: boolean;
    profitTargetMissed: boolean;
    manualFailure: boolean;
    systemFailure: boolean;
    timestamp: string | null;
    lastVpsHeartbeat: string | null;
  };
  account: {
    inventoryLogin: string | null;
    server: string | null;
    vpsSlot: string | null;
    provisionDate: string | null;
    retirementDate: string | null;
    estimatedDeleteDate: string | null;
    currentInventoryStatus: string;
  };
  ruleViolationsCount: number;
  adminNotes: string;
  reviewed: boolean;
  workflow: WorkflowStep[];
}

export interface DeletionMonitor {
  within3Days: number;
  within7Days: number;
  oldestRetiredLogin: string | null;
  oldestRetiredDays: number | null;
  alreadyLikelyDeleted: number;
  notYetResetCount: number;
}

export interface FailureAnalytics {
  bySize: { size: string; count: number }[];
  byReason: { reason: string; count: number }[];
  byPhase: { phase: string; count: number }[];
  byDay: { date: string; count: number }[];
}

function determineFailureReason(challenge: any): string {
  if (challenge.hold_time_warnings_notified > 3) return "Minimum Hold Time Violation";
  if (challenge.weekend_hold_warnings > 1) return "Weekend Holding Violation";
  // Genuine cause isn't stored as a distinct enum on the row itself —
  // drawdown vs inactivity vs news-trading are all just "status:
  // failed" with no separate reason column. Best-effort inference
  // from the data that IS stored; a real "failure_reason" column
  // would be a worthwhile future addition if precise reasons matter
  // operationally.
  if (challenge.drawdown_warning_sent) return "Maximum Drawdown Breach (likely)";
  return "Rule Violation (exact cause not separately recorded)";
}

function computeRetirementStatus(accountStatus: string | null, daysSinceLastActivity: number | null): { status: RetirementStatus; estimatedDeleteDate: string | null; daysRemaining: number | null } {
  if (accountStatus !== "resetting" || daysSinceLastActivity === null) {
    return { status: "not_yet_reset", estimatedDeleteDate: null, daysRemaining: null };
  }
  const daysRemaining = DELETION_WINDOW_DAYS - daysSinceLastActivity;
  const estimatedDeleteDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString();
  return {
    status: daysRemaining <= 0 ? "likely_deleted" : "counting_down",
    estimatedDeleteDate,
    daysRemaining,
  };
}

export async function getFailedTraderStats(): Promise<FailedTraderStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const failedQuery = await serviceClient.from("user_challenges").select("id, trading_account_id, completed_at").eq("status", "failed");
  const failedRows = (failedQuery.data as any[]) ?? [];

  const accountIds = [...new Set(failedRows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, status, last_known_activity_at").in("id", accountIds)
    : { data: [] as any[] };
  const accountById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a]));

  let awaitingDeletion = 0, totalDaysRemaining = 0, countingCount = 0;
  for (const r of failedRows) {
    const account = r.trading_account_id ? accountById.get(r.trading_account_id) : null;
    if (account?.status === "resetting" && account.last_known_activity_at) {
      const daysSince = Math.floor((Date.now() - new Date(account.last_known_activity_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = DELETION_WINDOW_DAYS - daysSince;
      if (daysRemaining > 0) {
        awaitingDeletion++;
        totalDaysRemaining += daysRemaining;
        countingCount++;
      }
    }
  }

  const violationsTodayQuery = await serviceClient
    .from("user_challenges")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .gte("completed_at", todayStart);

  return {
    totalFailed: failedRows.length,
    failedToday: failedRows.filter((r) => r.completed_at && r.completed_at >= todayStart).length,
    failedThisWeek: failedRows.filter((r) => r.completed_at && r.completed_at >= weekStart).length,
    awaitingDeletion,
    avgDaysUntilDeletion: countingCount > 0 ? Math.round(totalDaysRemaining / countingCount) : 0,
    ruleViolationsToday: violationsTodayQuery.count ?? 0,
  };
}

export async function getFailedTradersPage(params: {
  search?: string;
  filter?: string;
  page: number;
  pageSize: number;
}): Promise<FailedTraderListResult> {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const term = search.trim();
    const usersQuery = await serviceClient.from("users").select("id").or(`email.ilike.%${term}%,username.ilike.%${term}%,full_name.ilike.%${term}%`);
    matchingUserIds = (usersQuery.data as { id: string }[] ?? []).map((u) => u.id);
  }

  let query = serviceClient.from("user_challenges").select("*").eq("status", "failed");

  if (search && search.trim()) {
    const term = search.trim();
    const orParts = [`account_login.ilike.%${term}%`, `id.eq.${term}`];
    if (matchingUserIds && matchingUserIds.length > 0) orParts.push(`user_id.in.(${matchingUserIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

  if (filter === "phase1") query = query.eq("current_phase", 1);
  else if (filter === "phase2") query = query.eq("current_phase", 2);

  const allMatchingQuery = await query.order("completed_at", { ascending: false, nullsFirst: false });
  let rows = (allMatchingQuery.data as any[]) ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email, full_name").in("id", userIds) : { data: [] as any[] };
  const usersById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u]));

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size, status, last_known_activity_at").in("id", accountIds)
    : { data: [] as any[] };
  const accountById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a]));

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let enriched: FailedTraderRow[] = rows.map((r) => {
    const user = usersById.get(r.user_id);
    const account = r.trading_account_id ? accountById.get(r.trading_account_id) : null;
    const daysSinceFailed = r.completed_at ? Math.floor((Date.now() - new Date(r.completed_at).getTime()) / (1000 * 60 * 60 * 24)) : null;
    const daysSinceActivity = account?.last_known_activity_at ? Math.floor((Date.now() - new Date(account.last_known_activity_at).getTime()) / (1000 * 60 * 60 * 24)) : null;
    const { status: retirementStatus, estimatedDeleteDate, daysRemaining } = computeRetirementStatus(account?.status ?? null, daysSinceActivity);

    return {
      id: r.id,
      email: user?.email ?? "unknown",
      full_name: user?.full_name ?? null,
      accountSize: account?.account_size ?? null,
      failureReason: determineFailureReason(r),
      phase: r.current_phase,
      failedAt: r.completed_at,
      daysSinceFailed,
      accountLogin: r.account_login,
      retirementStatus,
      estimatedDeleteDate,
      daysRemaining,
    };
  });

  if (filter === "failed_today") enriched = enriched.filter((t) => t.failedAt && t.failedAt >= todayStart);
  else if (filter === "failed_week") enriched = enriched.filter((t) => t.failedAt && t.failedAt >= weekStart);
  else if (filter === "awaiting_deletion") enriched = enriched.filter((t) => t.retirementStatus === "counting_down");
  else if (filter === "deleted") enriched = enriched.filter((t) => t.retirementStatus === "likely_deleted");

  const totalCount = enriched.length;
  const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);

  return { traders: pageItems, totalCount };
}

export async function getFailedTraderDetail(challengeId: string): Promise<FailedTraderDetail | null> {
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("*").eq("id", challengeId).single();
  const challenge = challengeQuery.data as any;
  if (challengeQuery.error || !challenge) return null;

  const userQuery = await serviceClient.from("users").select("id, email, full_name, username, country, phone").eq("id", challenge.user_id).single();
  const user = userQuery.data as any;

  const accountQuery = challenge.trading_account_id
    ? await serviceClient.from("trading_accounts").select("account_size, server, status, assigned_at, last_reset_at, last_known_activity_at").eq("id", challenge.trading_account_id).single()
    : { data: null };
  const account = accountQuery.data as any;

  const slotQuery = await serviceClient.from("vps_slots").select("slot_label").eq("current_user_challenge_id", challengeId).maybeSingle();
  const vpsSlot = (slotQuery.data as { slot_label: string } | null)?.slot_label ?? null;

  const purchasesQuery = await serviceClient
    .from("challenge_purchases")
    .select("created_at")
    .eq("user_id", challenge.user_id)
    .order("created_at", { ascending: false });
  const purchases = (purchasesQuery.data as { created_at: string }[]) ?? [];
  const closestPurchase = purchases
    .filter((p) => new Date(p.created_at) <= new Date(challenge.created_at))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? purchases[purchases.length - 1];

  const ruleViolationsCount = (challenge.hold_time_warnings_notified ?? 0) + (challenge.weekend_hold_warnings ?? 0) + (challenge.drawdown_warning_sent ? 1 : 0);

  const daysSinceActivity = account?.last_known_activity_at ? Math.floor((Date.now() - new Date(account.last_known_activity_at).getTime()) / (1000 * 60 * 60 * 24)) : null;
  const { estimatedDeleteDate } = computeRetirementStatus(account?.status ?? null, daysSinceActivity);

  const isRetired = account?.status === "resetting" || account?.status === "expired";

  const workflow: WorkflowStep[] = [
    { label: "Challenge Purchased", timestamp: closestPurchase?.created_at ?? null, reached: !!closestPurchase },
    { label: "Account Provisioned", timestamp: account?.assigned_at ?? challenge.created_at, reached: !!challenge.trading_account_id },
    { label: "Trading Started", timestamp: challenge.start_date ?? challenge.created_at, reached: true },
    { label: "Rule Breached", timestamp: challenge.completed_at, reached: challenge.status === "failed", current: challenge.status === "failed" && !isRetired },
    { label: "Account Retired", timestamp: isRetired ? (account?.last_reset_at ?? challenge.completed_at) : null, reached: isRetired },
    { label: "Waiting For Exness Auto Deletion", timestamp: null, reached: isRetired, current: isRetired && account?.status === "resetting" },
    { label: "Deleted (estimated)", timestamp: estimatedDeleteDate, reached: false },
  ];

  return {
    customer: { name: user?.full_name ?? null, email: user?.email ?? "unknown", username: user?.username ?? null, country: user?.country ?? null, phone: user?.phone ?? null },
    challenge: {
      challengeSize: account?.account_size ?? null,
      purchaseDate: closestPurchase?.created_at ?? null,
      phaseReached: challenge.current_phase,
      startingBalance: account?.account_size ?? null,
      finalBalance: challenge.last_known_balance,
      finalEquity: challenge.last_known_equity,
      highestEquity: challenge.peak_closed_balance,
    },
    failure: {
      reason: determineFailureReason(challenge),
      dailyDrawdownBreached: false, // no such rule exists in our system
      maxDrawdownBreached: !!challenge.drawdown_warning_sent,
      profitTargetMissed: challenge.status === "failed",
      manualFailure: false, // no distinct tracking of admin-triggered vs system-triggered failure exists yet
      systemFailure: true,
      timestamp: challenge.completed_at,
      lastVpsHeartbeat: challenge.last_known_check_at,
    },
    account: {
      inventoryLogin: challenge.account_login,
      server: account?.server ?? null,
      vpsSlot,
      provisionDate: account?.assigned_at ?? null,
      retirementDate: isRetired ? (account?.last_reset_at ?? null) : null,
      estimatedDeleteDate,
      currentInventoryStatus: account?.status ?? "unknown",
    },
    ruleViolationsCount,
    adminNotes: "Not implemented yet — no admin notes system exists.",
    reviewed: false, // no review-tracking column exists yet
    workflow,
  };
}

export async function getDeletionMonitor(): Promise<DeletionMonitor> {
  const serviceClient = createServiceClient();

  const resettingQuery = await serviceClient
    .from("trading_accounts")
    .select("login, last_known_activity_at")
    .eq("status", "resetting")
    .not("last_known_activity_at", "is", null);

  const rows = ((resettingQuery.data ?? []) as unknown as { login: string; last_known_activity_at: string }[]);

  let within3Days = 0, within7Days = 0, alreadyLikelyDeleted = 0;
  let oldestRetiredLogin: string | null = null, oldestDaysSince = -1;

  for (const r of rows) {
    const daysSince = Math.floor((Date.now() - new Date(r.last_known_activity_at).getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = DELETION_WINDOW_DAYS - daysSince;

    if (daysRemaining <= 0) alreadyLikelyDeleted++;
    else if (daysRemaining <= 3) within3Days++;
    else if (daysRemaining <= 7) within7Days++;

    if (daysSince > oldestDaysSince) {
      oldestDaysSince = daysSince;
      oldestRetiredLogin = r.login;
    }
  }

  const notYetResetQuery = await serviceClient
    .from("user_challenges")
    .select("id, trading_account_id")
    .eq("status", "failed");
  const failedRows = (notYetResetQuery.data as { trading_account_id: string | null }[]) ?? [];
  const failedAccountIds = [...new Set(failedRows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountStatusQuery = failedAccountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, status").in("id", failedAccountIds)
    : { data: [] as any[] };
  const notYetResetCount = (accountStatusQuery.data as { status: string }[] ?? []).filter((a) => a.status !== "resetting" && a.status !== "expired" && a.status !== "available").length;

  return {
    within3Days,
    within7Days,
    oldestRetiredLogin,
    oldestRetiredDays: oldestDaysSince >= 0 ? oldestDaysSince : null,
    alreadyLikelyDeleted,
    notYetResetCount,
  };
}

export async function getFailureAnalytics(): Promise<FailureAnalytics> {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("current_phase, trading_account_id, completed_at, hold_time_warnings_notified, weekend_hold_warnings, drawdown_warning_sent")
    .eq("status", "failed");
  const rows = (query.data as any[]) ?? [];

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a.account_size]));

  const sizeCounts = new Map<number, number>();
  const reasonCounts = new Map<string, number>();
  const phaseCounts = new Map<number, number>();
  const dayCounts = new Map<string, number>();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
    dayCounts.set(key, 0);
  }

  for (const r of rows) {
    const size = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    if (size !== null) sizeCounts.set(size, (sizeCounts.get(size) ?? 0) + 1);

    const reason = determineFailureReason(r);
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);

    phaseCounts.set(r.current_phase, (phaseCounts.get(r.current_phase) ?? 0) + 1);

    if (r.completed_at) {
      const key = new Date(Date.UTC(new Date(r.completed_at).getUTCFullYear(), new Date(r.completed_at).getUTCMonth(), new Date(r.completed_at).getUTCDate())).toISOString().slice(0, 10);
      if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    bySize: [...sizeCounts.entries()].sort((a, b) => a[0] - b[0]).map(([size, count]) => ({ size: `₦${size.toLocaleString()}`, count })),
    byReason: [...reasonCounts.entries()].map(([reason, count]) => ({ reason, count })),
    byPhase: [...phaseCounts.entries()].sort((a, b) => a[0] - b[0]).map(([phase, count]) => ({ phase: `Phase ${phase}`, count })),
    byDay: [...dayCounts.entries()].map(([date, count]) => ({ date, count })),
  };
}
