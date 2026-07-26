import { createServiceClient } from "@/lib/supabase/service";

export interface PassedTraderStats {
  totalPassed: number;
  stuckNeedsFunding: number;
  fundedToday: number;
  readyAccountsAvailable: number;
  avgWaitSeconds: number;
}

export type FundingStatus = "funded" | "stuck";

export interface PassedTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  accountSize: number | null;
  completedAt: string | null;
  waitSeconds: number | null;
  fundingStatus: FundingStatus;
  fundedAccountLogin: string | null;
  vpsSlot: string | null;
}

export interface PassedTraderListResult {
  traders: PassedTraderRow[];
  totalCount: number;
}

export interface WorkflowStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  errored?: boolean;
}

export interface PassedTraderDetail {
  customer: { name: string | null; email: string; username: string | null; country: string | null };
  challengeCompletedAt: string | null;
  phase1Result: { passed: boolean; timestamp: string | null };
  phase2Result: { passed: boolean; timestamp: string | null };
  profitTargetAchieved: boolean;
  ruleViolationsCount: number;
  fundingStatus: FundingStatus;
  fundedAccount: { login: string | null; vpsSlot: string | null } | null;
  fundedAt: string | null;
  credentialsSent: boolean;
  assignedBy: string;
  internalNotes: string;
  workflow: WorkflowStep[];
  fundedChallengeId: string | null;
  originalChallengeId: string;
  userId: string;
}

export interface QueueInsights {
  longestWaitingEmail: string | null;
  longestWaitingSeconds: number | null;
  avgFundingDelaySeconds: number;
  oldestPendingEmail: string | null;
  oldestPendingSince: string | null;
  fundedTodayCount: number;
  stuckCount: number;
}

function fmtWait(seconds: number | null): number {
  return seconds ?? 0;
}

async function findFundedContinuation(serviceClient: ReturnType<typeof createServiceClient>, userId: string, passedChallenge: { completed_at: string | null; created_at: string }) {
  const query = await serviceClient
    .from("user_challenges")
    .select("id, account_login, created_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("current_phase", 3)
    .order("created_at", { ascending: true });

  const candidates = (query.data as any[]) ?? [];
  const passedTime = new Date(passedChallenge.completed_at ?? passedChallenge.created_at).getTime();
  return candidates.find((c) => new Date(c.created_at).getTime() >= passedTime) ?? candidates[0] ?? null;
}

export async function getPassedTraderStats(): Promise<PassedTraderStats> {
  const serviceClient = createServiceClient();

  const passedQuery = await serviceClient.from("user_challenges").select("id, user_id, completed_at, created_at").eq("status", "passed");
  const passedRows = (passedQuery.data as any[]) ?? [];

  const userIds = [...new Set(passedRows.map((r) => r.user_id))];
  const continuationsQuery = userIds.length > 0
    ? await serviceClient.from("user_challenges").select("user_id, created_at").in("user_id", userIds).eq("status", "active").eq("current_phase", 3)
    : { data: [] as any[] };
  const continuationsByUser = new Map<string, any[]>();
  for (const c of (continuationsQuery.data as any[]) ?? []) {
    if (!continuationsByUser.has(c.user_id)) continuationsByUser.set(c.user_id, []);
    continuationsByUser.get(c.user_id)!.push(c);
  }

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  let stuck = 0, fundedToday = 0;
  let totalWait = 0, waitCount = 0;

  for (const r of passedRows) {
    const conts = continuationsByUser.get(r.user_id) ?? [];
    const passedTime = new Date(r.completed_at ?? r.created_at).getTime();
    const match = conts.find((c) => new Date(c.created_at).getTime() >= passedTime) ?? conts[0];
    if (!match) {
      stuck++;
    } else {
      const waitSeconds = Math.max(0, (new Date(match.created_at).getTime() - passedTime) / 1000);
      totalWait += waitSeconds;
      waitCount++;
      if (match.created_at >= todayStart) fundedToday++;
    }
  }

  const availableQuery = await serviceClient.from("trading_accounts").select("id", { count: "exact", head: true }).eq("status", "available");

  return {
    totalPassed: passedRows.length,
    stuckNeedsFunding: stuck,
    fundedToday,
    readyAccountsAvailable: availableQuery.count ?? 0,
    avgWaitSeconds: waitCount > 0 ? Math.round(totalWait / waitCount) : 0,
  };
}

export async function getPassedTradersPage(params: {
  search?: string;
  filter?: string;
  page: number;
  pageSize: number;
}): Promise<PassedTraderListResult> {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const term = search.trim();
    const usersQuery = await serviceClient.from("users").select("id").or(`email.ilike.%${term}%,username.ilike.%${term}%`);
    matchingUserIds = (usersQuery.data as { id: string }[] ?? []).map((u) => u.id);
  }

  let query = serviceClient.from("user_challenges").select("*").eq("status", "passed");

  if (search && search.trim()) {
    const term = search.trim();
    const orParts = [`account_login.ilike.%${term}%`, `id.eq.${term}`];
    if (matchingUserIds && matchingUserIds.length > 0) orParts.push(`user_id.in.(${matchingUserIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const allMatchingQuery = await query.order("completed_at", { ascending: false, nullsFirst: false });
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

  const continuationsQuery = userIds.length > 0
    ? await serviceClient.from("user_challenges").select("id, user_id, account_login, created_at").in("user_id", userIds).eq("status", "active").eq("current_phase", 3)
    : { data: [] as any[] };
  const continuationsByUser = new Map<string, any[]>();
  for (const c of (continuationsQuery.data as any[]) ?? []) {
    if (!continuationsByUser.has(c.user_id)) continuationsByUser.set(c.user_id, []);
    continuationsByUser.get(c.user_id)!.push(c);
  }

  const fundedChallengeIds = [...new Set((continuationsQuery.data as any[] ?? []).map((c) => c.id))];
  const slotsQuery = fundedChallengeIds.length > 0
    ? await serviceClient.from("vps_slots").select("slot_label, current_user_challenge_id").in("current_user_challenge_id", fundedChallengeIds)
    : { data: [] as any[] };
  const slotByChallenge = new Map((slotsQuery.data as any[] ?? []).map((s) => [s.current_user_challenge_id, s.slot_label]));

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  let enriched: PassedTraderRow[] = rows.map((r) => {
    const user = usersById.get(r.user_id);
    const accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;
    const conts = continuationsByUser.get(r.user_id) ?? [];
    const passedTime = new Date(r.completed_at ?? r.created_at).getTime();
    const match = conts.find((c) => new Date(c.created_at).getTime() >= passedTime) ?? conts[0];

    return {
      id: r.id,
      email: user?.email ?? "unknown",
      full_name: user?.full_name ?? null,
      accountSize,
      completedAt: r.completed_at,
      waitSeconds: match ? Math.max(0, (new Date(match.created_at).getTime() - passedTime) / 1000) : null,
      fundingStatus: match ? "funded" : "stuck",
      fundedAccountLogin: match?.account_login ?? null,
      vpsSlot: match ? slotByChallenge.get(match.id) ?? null : null,
    };
  });

  if (filter === "passed_today") enriched = enriched.filter((t) => t.completedAt && t.completedAt >= todayStart);
  else if (filter === "passed_week") enriched = enriched.filter((t) => t.completedAt && t.completedAt >= weekStart);
  else if (filter === "funding_pending" || filter === "funding_in_progress" || filter === "ready_for_funding") enriched = enriched.filter((t) => t.fundingStatus === "stuck");

  const totalCount = enriched.length;
  const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);

  return { traders: pageItems, totalCount };
}

export async function getPassedTraderDetail(challengeId: string): Promise<PassedTraderDetail | null> {
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("*").eq("id", challengeId).single();
  const challenge = challengeQuery.data as any;
  if (challengeQuery.error || !challenge) return null;

  const userQuery = await serviceClient.from("users").select("id, email, full_name, username, country").eq("id", challenge.user_id).single();
  const user = userQuery.data as any;

  const match = await findFundedContinuation(serviceClient, challenge.user_id, challenge);
  const fundingStatus: FundingStatus = match ? "funded" : "stuck";

  let vpsSlot: string | null = null;
  if (match) {
    const slotQuery = await serviceClient.from("vps_slots").select("slot_label").eq("current_user_challenge_id", match.id).maybeSingle();
    vpsSlot = (slotQuery.data as { slot_label: string } | null)?.slot_label ?? null;
  }

  const ruleViolationsCount = (challenge.hold_time_warnings_notified ?? 0) + (challenge.weekend_hold_warnings ?? 0) + (challenge.drawdown_warning_sent ? 1 : 0);

  const passedTimestamp = challenge.completed_at ?? challenge.created_at;

  // All post-pass steps share the SAME real timestamp when funding
  // succeeds, since our allocate_trading_account RPC + email send
  // happen synchronously in one function call, not as separate
  // tracked stages. If funding is stuck, none of them are reached —
  // there's no real partial-progress state in our system.
  const workflow: WorkflowStep[] = [
    { label: "Challenge Passed", timestamp: passedTimestamp, reached: true },
    { label: "Queued For Funding", timestamp: match ? passedTimestamp : null, reached: !!match },
    { label: "Inventory Assigned", timestamp: match?.created_at ?? null, reached: !!match },
    { label: "Python Provision Started", timestamp: match?.created_at ?? null, reached: !!match },
    { label: "MT5 Credentials Generated", timestamp: match?.created_at ?? null, reached: !!match },
    { label: "Credentials Delivered", timestamp: match?.created_at ?? null, reached: !!match },
    { label: "Trader Marked Funded", timestamp: match?.created_at ?? null, reached: !!match, errored: !match },
  ];

  return {
    customer: { name: user?.full_name ?? null, email: user?.email ?? "unknown", username: user?.username ?? null, country: user?.country ?? null },
    challengeCompletedAt: challenge.completed_at,
    phase1Result: { passed: true, timestamp: challenge.phase1_passed_at },
    phase2Result: { passed: challenge.status === "passed", timestamp: challenge.completed_at },
    profitTargetAchieved: true,
    ruleViolationsCount,
    fundingStatus,
    fundedAccount: match ? { login: match.account_login, vpsSlot } : null,
    fundedAt: match?.created_at ?? null,
    credentialsSent: !!match,
    assignedBy: "Automatic (System)",
    internalNotes: "Not implemented yet — no admin notes system exists.",
    workflow,
    fundedChallengeId: match?.id ?? null,
    originalChallengeId: challenge.id,
    userId: challenge.user_id,
  };
}

export async function getQueueInsights(): Promise<QueueInsights> {
  const serviceClient = createServiceClient();

  const passedQuery = await serviceClient.from("user_challenges").select("id, user_id, completed_at, created_at").eq("status", "passed");
  const passedRows = (passedQuery.data as any[]) ?? [];

  const userIds = [...new Set(passedRows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email").in("id", userIds) : { data: [] as any[] };
  const emailsById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u.email]));

  const continuationsQuery = userIds.length > 0
    ? await serviceClient.from("user_challenges").select("user_id, created_at").in("user_id", userIds).eq("status", "active").eq("current_phase", 3)
    : { data: [] as any[] };
  const continuationsByUser = new Map<string, any[]>();
  for (const c of (continuationsQuery.data as any[]) ?? []) {
    if (!continuationsByUser.has(c.user_id)) continuationsByUser.set(c.user_id, []);
    continuationsByUser.get(c.user_id)!.push(c);
  }

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  let longestWaitingEmail: string | null = null, longestWaitingSeconds = 0;
  let oldestPendingEmail: string | null = null, oldestPendingTime: number | null = null;
  let totalDelay = 0, delayCount = 0, fundedTodayCount = 0, stuckCount = 0;

  for (const r of passedRows) {
    const conts = continuationsByUser.get(r.user_id) ?? [];
    const passedTime = new Date(r.completed_at ?? r.created_at).getTime();
    const match = conts.find((c) => new Date(c.created_at).getTime() >= passedTime) ?? conts[0];

    if (!match) {
      stuckCount++;
      const stuckSince = passedTime;
      if (oldestPendingTime === null || stuckSince < oldestPendingTime) {
        oldestPendingTime = stuckSince;
        oldestPendingEmail = emailsById.get(r.user_id) ?? null;
      }
      const waitingSoFar = (Date.now() - stuckSince) / 1000;
      if (waitingSoFar > longestWaitingSeconds) {
        longestWaitingSeconds = waitingSoFar;
        longestWaitingEmail = emailsById.get(r.user_id) ?? null;
      }
    } else {
      const delaySeconds = Math.max(0, (new Date(match.created_at).getTime() - passedTime) / 1000);
      totalDelay += delaySeconds;
      delayCount++;
      if (match.created_at >= todayStart) fundedTodayCount++;
    }
  }

  return {
    longestWaitingEmail,
    longestWaitingSeconds: stuckCount > 0 ? Math.round(longestWaitingSeconds) : null,
    avgFundingDelaySeconds: delayCount > 0 ? Math.round(totalDelay / delayCount) : 0,
    oldestPendingEmail,
    oldestPendingSince: oldestPendingTime ? new Date(oldestPendingTime).toISOString() : null,
    fundedTodayCount,
    stuckCount,
  };
}
