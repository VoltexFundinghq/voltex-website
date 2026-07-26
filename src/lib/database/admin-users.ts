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
  challengeHistory: {
    id: string;
    challenge_size: string;
    account_size: number | null;
    created_at: string;
    completed_at: string | null;
    current_phase: number;
    status: string;
    account_login: string | null;
  }[];
  financialSummary: {
    lifetimeSpend: number;
    totalPurchases: number;
    activeChallenges: number;
    passedChallenges: number;
    failedChallenges: number;
    fundedAccounts: number;
    totalPayouts: number;
    pendingPayouts: number;
    lastPurchaseDate: string | null;
  };
  tradingAccounts: {
    account_login: string | null;
    broker: string | null;
    server: string | null;
    pa_label: string | null;
    status: string;
    assigned_at: string | null;
    last_reset_at: string | null;
    vpsSlotLabel: string | null;
    vpsHealthy: boolean | null;
  }[];
  isAwaitingProvisioning: boolean;
}

function challengeLabel(status: string | null, phase: number | null, size: number | null): string {
  if (!status || status !== "active") return "No Active Challenge";
  const sizeLabel = size ? `₦${size.toLocaleString()}` : "";
  if (phase === 3) return `${sizeLabel} Funded`.trim();
  return `${sizeLabel} Phase ${phase}`.trim();
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
    .select("id, challenge_id, trading_account_id, status, current_phase, account_login, created_at, completed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const challenges = (challengesQuery.data as any[]) ?? [];

  const payoutsQuery = await serviceClient
    .from("payout_requests")
    .select("amount, status")
    .eq("user_id", userId);

  const payoutRows = (payoutsQuery.data as { amount: number; status: string }[]) ?? [];
  const totalPayouts = payoutRows.filter((p) => p.status === "approved" || p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
  const pendingPayouts = payoutRows.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  const purchasesQuery = await serviceClient
    .from("challenge_purchases")
    .select("price_paid, payment_status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const purchaseRows = (purchasesQuery.data as { price_paid: number; payment_status: string; created_at: string }[]) ?? [];
  const completed = purchaseRows.filter((p) => p.payment_status === "completed");
  const lifetimeSpend = completed.reduce((s, p) => s + Number(p.price_paid), 0);

  const accountIds = challenges.map((c) => c.trading_account_id).filter((id): id is string => !!id);
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, login, broker, server, pa_label, status, assigned_at, last_reset_at").in("id", accountIds)
    : { data: [] as any[] };

  const accountRows = (accountsQuery.data as any[]) ?? [];

  const slotsQuery = await serviceClient.from("vps_slots").select("slot_label, current_user_challenge_id");
  const activeChallengeIds = new Set(challenges.filter((c) => c.status === "active").map((c) => c.id));
  const slotByChallenge = new Map(
    (slotsQuery.data as { slot_label: string; current_user_challenge_id: string | null }[] ?? [])
      .filter((s) => s.current_user_challenge_id && activeChallengeIds.has(s.current_user_challenge_id))
      .map((s) => [s.current_user_challenge_id as string, s.slot_label])
  );

  const activeChallengeByAccount = new Map(challenges.filter((c) => c.status === "active" && c.trading_account_id).map((c) => [c.trading_account_id, c]));

  const accountSizesForChallengeHistory = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
    : { data: [] as any[] };
  const sizeById = new Map((accountSizesForChallengeHistory.data as { id: string; account_size: number }[] ?? []).map((a) => [a.id, a.account_size]));

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
    challengeHistory: challenges.map((c) => ({
      id: c.id,
      challenge_size: c.challenge_id,
      account_size: c.trading_account_id ? sizeById.get(c.trading_account_id) ?? null : null,
      created_at: c.created_at,
      completed_at: c.completed_at,
      current_phase: c.current_phase,
      status: c.status,
      account_login: c.account_login,
    })),
    financialSummary: {
      lifetimeSpend,
      totalPurchases: completed.length,
      activeChallenges: challenges.filter((c) => c.status === "active").length,
      passedChallenges: challenges.filter((c) => c.status === "passed").length,
      failedChallenges: challenges.filter((c) => c.status === "failed").length,
      fundedAccounts: challenges.filter((c) => c.status === "active" && c.current_phase === 3).length,
      totalPayouts,
      pendingPayouts,
      lastPurchaseDate: purchaseRows[0]?.created_at ?? null,
    },
    tradingAccounts: accountRows.map((a) => {
      const relatedChallenge = activeChallengeByAccount.get(a.id);
      const slotLabel = relatedChallenge ? slotByChallenge.get(relatedChallenge.id) ?? null : null;
      const vpsHealthy = relatedChallenge?.last_known_check_at
        ? (Date.now() - new Date(relatedChallenge.last_known_check_at).getTime()) < 60 * 1000
        : null;
      return {
        account_login: a.login,
        broker: a.broker,
        server: a.server,
        pa_label: a.pa_label,
        status: a.status,
        assigned_at: a.assigned_at,
        last_reset_at: a.last_reset_at,
        vpsSlotLabel: slotLabel,
        vpsHealthy: slotLabel ? vpsHealthy : null,
      };
    }),
    isAwaitingProvisioning: challenges.some((c) => c.status === "awaiting_allocation"),
  };
}
