import { createServiceClient } from "@/lib/supabase/service";

export interface UserSummaryStats {
  totalUsers: number;
  activeTraders: number;
  suspendedUsers: number;
  fundedTraders: number;
  totalPurchases: number;
  totalRevenue: number;
}

export interface UserListRow {
  id: string;
  full_name: string | null;
  email: string;
  username: string | null;
  country: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
  currentChallengeLabel: string;
  totalPurchases: number;
  lifetimeSpend: number;
  lastActivity: string | null;
}

export interface UserListResult {
  users: UserListRow[];
  totalCount: number;
}

export interface TimelineStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
}

export interface UserDetail {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    username: string | null;
    country: string | null;
    phone: string | null;
    created_at: string;
    last_sign_in_at: string | null;
  };
  challengeTimeline: TimelineStep[];
  financialSummary: {
    totalChallengePurchases: number;
    totalRevenue: number;
    refunds: number;
    payoutsPaid: number;
    outstandingPayout: number;
    netRevenue: number;
  };
  assignedAccounts: {
    account_login: string | null;
    server: string | null;
    currentStage: string;
    challenge_size: string | null;
    assigned_at: string | null;
    status: string;
    password_last_reset_at: string | null;
    last_sync: string | null;
  }[];
  isAwaitingProvisioning: boolean;
}

function challengeLabel(status: string | null, phase: number | null, size: number | null): string {
  if (!status || status !== "active") return "No Active Challenge";
  const sizeLabel = size ? `₦${size.toLocaleString()}` : "";
  if (phase === 3) return `${sizeLabel} Funded`.trim();
  return `${sizeLabel} Phase ${phase}`.trim();
}

function currentStageLabel(status: string, phase: number): string {
  if (status === "active" && phase === 3) return "Funded";
  if (status === "active") return `Phase ${phase}`;
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed (Retired)";
  return status;
}

export async function getUserSummaryStats(): Promise<UserSummaryStats> {
  const serviceClient = createServiceClient();

  const [totalUsers, activeTraders, suspended, funded, purchases] = await Promise.all([
    serviceClient.from("users").select("id", { count: "exact", head: true }),
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "active"),
    serviceClient.from("users").select("id", { count: "exact", head: true }).eq("is_suspended", true),
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "active").eq("current_phase", 3),
    serviceClient.from("challenge_purchases").select("price_paid").eq("payment_status", "completed"),
  ]);

  const purchaseRows = purchases.data as { price_paid: number }[] | null;
  const totalRevenue = (purchaseRows ?? []).reduce((sum, r) => sum + Number(r.price_paid), 0);

  return {
    totalUsers: totalUsers.count ?? 0,
    activeTraders: activeTraders.count ?? 0,
    suspendedUsers: suspended.count ?? 0,
    fundedTraders: funded.count ?? 0,
    totalPurchases: purchaseRows?.length ?? 0,
    totalRevenue,
  };
}

export async function getUsersPage(params: {
  search?: string;
  filter?: string;
  page: number;
  pageSize: number;
}): Promise<UserListResult> {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let matchingUserIds: Set<string> | null = null;

  if (search && search.trim()) {
    const term = search.trim();
    const [byAccount, byChallengeId] = await Promise.all([
      serviceClient.from("user_challenges").select("user_id").ilike("account_login", `%${term}%`),
      serviceClient.from("user_challenges").select("user_id").ilike("id", `%${term}%`),
    ]);
    const ids = new Set<string>();
    (byAccount.data as { user_id: string }[] ?? []).forEach((r) => ids.add(r.user_id));
    (byChallengeId.data as { user_id: string }[] ?? []).forEach((r) => ids.add(r.user_id));
    matchingUserIds = ids;
  }

  let query = serviceClient.from("users").select("*", { count: "exact" });

  if (search && search.trim()) {
    const term = search.trim();
    const idList = matchingUserIds && matchingUserIds.size > 0 ? [...matchingUserIds] : [];
    const orParts = [
      `full_name.ilike.%${term}%`,
      `email.ilike.%${term}%`,
      `username.ilike.%${term}%`,
      `id.eq.${term}`,
    ];
    if (idList.length > 0) {
      orParts.push(`id.in.(${idList.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  if (filter === "suspended") {
    query = query.eq("is_suspended", true);
  }

  let filterUserIds: string[] | null = null;
  if (["active", "passed", "failed", "funded", "pending_provisioning"].includes(filter)) {
    let challengeQuery = serviceClient.from("user_challenges").select("user_id");
    if (filter === "active") challengeQuery = challengeQuery.eq("status", "active").neq("current_phase", 3);
    else if (filter === "passed") challengeQuery = challengeQuery.eq("status", "passed");
    else if (filter === "failed") challengeQuery = challengeQuery.eq("status", "failed");
    else if (filter === "funded") challengeQuery = challengeQuery.eq("status", "active").eq("current_phase", 3);
    else if (filter === "pending_provisioning") challengeQuery = challengeQuery.eq("status", "awaiting_allocation");

    const result = await challengeQuery;
    filterUserIds = [...new Set((result.data as { user_id: string }[] ?? []).map((r) => r.user_id))];
    query = query.in("id", filterUserIds.length > 0 ? filterUserIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  query = query.order("created_at", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);

  const usersQuery = await query;
  const users = usersQuery.data as any[] | null;
  const totalCount = usersQuery.count ?? 0;

  if (!users || users.length === 0) return { users: [], totalCount };

  const userIds = users.map((u) => u.id);

  const [challengesQuery, purchasesQuery] = await Promise.all([
    serviceClient
      .from("user_challenges")
      .select("user_id, status, current_phase, trading_account_id, last_known_check_at, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }),
    serviceClient
      .from("challenge_purchases")
      .select("user_id, price_paid, payment_status, created_at")
      .in("user_id", userIds),
  ]);

  const challengesByUser = new Map<string, any[]>();
  for (const c of (challengesQuery.data as any[] ?? [])) {
    if (!challengesByUser.has(c.user_id)) challengesByUser.set(c.user_id, []);
    challengesByUser.get(c.user_id)!.push(c);
  }

  const purchasesByUser = new Map<string, any[]>();
  for (const p of (purchasesQuery.data as any[] ?? [])) {
    if (!purchasesByUser.has(p.user_id)) purchasesByUser.set(p.user_id, []);
    purchasesByUser.get(p.user_id)!.push(p);
  }

  const activeAccountIds = new Set<string>();
  (challengesQuery.data as any[] ?? []).forEach((c) => {
    if (c.status === "active" && c.trading_account_id) activeAccountIds.add(c.trading_account_id);
  });

  const accountSizesQuery = activeAccountIds.size > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", [...activeAccountIds])
    : { data: [] as any[] };
  const sizeById = new Map((accountSizesQuery.data as { id: string; account_size: number }[] ?? []).map((a) => [a.id, a.account_size]));

  const rows: UserListRow[] = users.map((u) => {
    const challenges = challengesByUser.get(u.id) ?? [];
    const activeChallenge = challenges.find((c) => c.status === "active");
    const purchasesForUser = purchasesByUser.get(u.id) ?? [];
    const completedPurchases = purchasesForUser.filter((p) => p.payment_status === "completed");
    const lifetimeSpend = completedPurchases.reduce((sum, p) => sum + Number(p.price_paid), 0);

    const lastPollerCheck = challenges.reduce<string | null>((latest, c) => {
      if (!c.last_known_check_at) return latest;
      if (!latest || new Date(c.last_known_check_at) > new Date(latest)) return c.last_known_check_at;
      return latest;
    }, null);
    const lastPurchaseTime = purchasesForUser.reduce<string | null>((latest, p) => {
      if (!latest || new Date(p.created_at) > new Date(latest)) return p.created_at;
      return latest;
    }, null);
    const lastActivity = [lastPollerCheck, lastPurchaseTime, u.created_at]
      .filter((d): d is string => !!d)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    const accountSize = activeChallenge?.trading_account_id ? sizeById.get(activeChallenge.trading_account_id) ?? null : null;

    return {
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      username: u.username,
      country: u.country,
      is_admin: u.is_admin,
      is_suspended: u.is_suspended ?? false,
      created_at: u.created_at,
      currentChallengeLabel: challengeLabel(activeChallenge?.status ?? null, activeChallenge?.current_phase ?? null, accountSize),
      totalPurchases: purchasesForUser.length,
      lifetimeSpend,
      lastActivity,
    };
  });

  return { users: rows, totalCount };
}

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const serviceClient = createServiceClient();

  const profileQuery = await serviceClient
    .from("users")
    .select("id, full_name, email, username, country, phone, created_at")
    .eq("id", userId)
    .single();

  const profile = profileQuery.data as any;
  if (profileQuery.error || !profile) return null;

  const authQuery = await serviceClient.auth.admin.getUserById(userId);
  const lastSignInAt = authQuery.data?.user?.last_sign_in_at ?? null;

  const challengesQuery = await serviceClient
    .from("user_challenges")
    .select("id, challenge_id, trading_account_id, status, current_phase, account_login, created_at, completed_at, last_known_check_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const challenges = (challengesQuery.data as any[]) ?? [];

  const purchasesQuery = await serviceClient
    .from("challenge_purchases")
    .select("price_paid, payment_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const purchaseRows = (purchasesQuery.data as { price_paid: number; payment_status: string; created_at: string }[]) ?? [];
  const completed = purchaseRows.filter((p) => p.payment_status === "completed");
  const refunded = purchaseRows.filter((p) => p.payment_status === "refunded");
  const totalRevenue = completed.reduce((s, p) => s + Number(p.price_paid), 0);
  const refundsTotal = refunded.reduce((s, p) => s + Number(p.price_paid), 0);

  const payoutsQuery = await serviceClient
    .from("payout_requests")
    .select("amount, status, requested_at, processed_at")
    .eq("user_id", userId)
    .order("requested_at", { ascending: true });

  const payoutRows = (payoutsQuery.data as { amount: number; status: string; requested_at: string; processed_at: string | null }[]) ?? [];
  const payoutsPaid = payoutRows.filter((p) => p.status === "approved" || p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const outstandingPayout = payoutRows.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  const accountIds = challenges.map((c) => c.trading_account_id).filter((id): id is string => !!id);
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, login, server, account_size, status, assigned_at, password_last_reset_at").in("id", accountIds)
    : { data: [] as any[] };
  const accountById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a]));

  const firstChallenge = challenges[0];
  const firstPurchase = purchaseRows[0];
  const firstAccount = firstChallenge?.trading_account_id ? accountById.get(firstChallenge.trading_account_id) : null;

  const phase1Pass = challenges.find((c) => c.status === "passed" && c.current_phase === 1) ?? challenges.find((c) => c.status === "active" && c.current_phase >= 2);
  const phase2Pass = challenges.find((c) => c.status === "passed" && c.current_phase === 2) ?? challenges.find((c) => c.status === "active" && c.current_phase === 3);
  const funded = challenges.find((c) => c.status === "active" && c.current_phase === 3);
  const anyFailed = challenges.find((c) => c.status === "failed");

  const timeline: TimelineStep[] = [
    { label: "Challenge Purchased", timestamp: firstPurchase?.created_at ?? null, reached: !!firstPurchase },
    { label: "Payment Confirmed", timestamp: completed[0]?.created_at ?? null, reached: completed.length > 0 },
    { label: "Inventory Assigned", timestamp: firstAccount?.assigned_at ?? firstChallenge?.created_at ?? null, reached: !!firstChallenge?.trading_account_id },
    { label: "Started Trading", timestamp: firstChallenge?.created_at ?? null, reached: !!firstChallenge },
    { label: "Passed Phase 1", timestamp: phase1Pass?.completed_at ?? null, reached: !!phase1Pass },
    { label: "Passed Phase 2", timestamp: phase2Pass?.completed_at ?? null, reached: !!phase2Pass },
    { label: "Funded", timestamp: funded?.created_at ?? null, reached: !!funded },
  ];

  payoutRows.forEach((p, i) => {
    timeline.push({ label: `Payout ${i + 1}`, timestamp: p.requested_at, reached: true });
    if (p.processed_at) {
      timeline.push({ label: `Balance Reset (after Payout ${i + 1})`, timestamp: p.processed_at, reached: true });
    }
  });

  if (anyFailed) {
    timeline.push({ label: "Retired (Failed)", timestamp: anyFailed.completed_at, reached: true });
  }

  return {
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      username: profile.username,
      country: profile.country,
      phone: profile.phone,
      created_at: profile.created_at,
      last_sign_in_at: lastSignInAt,
    },
    challengeTimeline: timeline,
    financialSummary: {
      totalChallengePurchases: purchaseRows.length,
      totalRevenue,
      refunds: refundsTotal,
      payoutsPaid,
      outstandingPayout,
      netRevenue: totalRevenue - refundsTotal - payoutsPaid,
    },
    assignedAccounts: challenges
      .filter((c) => c.trading_account_id)
      .map((c) => {
        const account = accountById.get(c.trading_account_id);
        return {
          account_login: c.account_login,
          server: account?.server ?? null,
          currentStage: currentStageLabel(c.status, c.current_phase),
          challenge_size: account?.account_size ? `₦${Number(account.account_size).toLocaleString()}` : null,
          assigned_at: account?.assigned_at ?? null,
          status: account?.status ?? c.status,
          password_last_reset_at: account?.password_last_reset_at ?? null,
          last_sync: c.last_known_check_at ?? null,
        };
      }),
    isAwaitingProvisioning: challenges.some((c) => c.status === "awaiting_allocation"),
  };
}
