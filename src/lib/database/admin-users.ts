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

export interface Journey {
  id: string;
  label: string;
  timeline: TimelineStep[];
  assignedAccounts: {
    account_login: string | null; server: string | null; currentStage: string;
    challenge_size: string | null; assigned_at: string | null; status: string;
    password_last_reset_at: string | null; last_sync: string | null;
  }[];
}

export interface Alert {
  label: string;
  active: boolean;
  detail: string;
  linkedTab: "Profile" | "Journeys" | "Financial" | null;
}

export interface ActivityEvent {
  text: string;
  timestamp: string;
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
    kyc_status: string;
    signupIpAddress: string | null;
    signupDeviceSummary: string | null;
    signupCapturedAt: string | null;
  };
  journeys: Journey[];
  alerts: Alert[];
  activityFeed: ActivityEvent[];
  financialSummary: {
    totalChallengePurchases: number;
    totalRevenue: number;
    refunds: number;
    payoutsPaid: number;
    outstandingPayout: number;
    netRevenue: number;
  };
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
    .select("id, full_name, email, username, country, phone, created_at, kyc_status, signup_ip_address, signup_device_summary, signup_captured_at")
    .eq("id", userId)
    .single();

  const profile = profileQuery.data as any;
  if (profileQuery.error || !profile) return null;

  const authQuery = await serviceClient.auth.admin.getUserById(userId);
  const lastSignInAt = authQuery.data?.user?.last_sign_in_at ?? null;

  const challengesQuery = await serviceClient
    .from("user_challenges")
    .select("id, challenge_id, trading_account_id, status, current_phase, account_login, created_at, completed_at, phase1_passed_at, last_known_check_at, hold_time_warnings_notified, drawdown_warning_sent, weekend_hold_warnings")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const challenges = (challengesQuery.data as any[]) ?? [];

  const purchasesQuery = await serviceClient
    .from("challenge_purchases")
    .select("price_paid, payment_status, created_at, challenge_size")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const purchaseRows = (purchasesQuery.data as { price_paid: number; payment_status: string; created_at: string; challenge_size: string }[]) ?? [];
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

  const correlationQuery = await serviceClient
    .from("correlation_flags")
    .select("id")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  const accountIds = challenges.map((c) => c.trading_account_id).filter((id): id is string => !!id);
  const accountsQuery = accountIds.length > 0
    ? await serviceClient.from("trading_accounts").select("id, login, server, account_size, status, assigned_at, password_last_reset_at").in("id", accountIds)
    : { data: [] as any[] };
  const accountById = new Map((accountsQuery.data as any[] ?? []).map((a) => [a.id, a]));

  const roots = challenges.filter((c) => c.current_phase !== 3).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const continuations = challenges.filter((c) => c.current_phase === 3);

  const rootToContinuation = new Map<string, any>();
  const usedRoots = new Set<string>();
  for (const cont of continuations) {
    const candidate = [...roots]
      .filter((r) => r.status === "passed" && !usedRoots.has(r.id) && new Date(r.completed_at ?? r.created_at).getTime() <= new Date(cont.created_at).getTime())
      .sort((a, b) => new Date(b.completed_at ?? b.created_at).getTime() - new Date(a.completed_at ?? a.created_at).getTime())[0];
    if (candidate) {
      rootToContinuation.set(candidate.id, cont);
      usedRoots.add(candidate.id);
    }
  }

  const journeys: Journey[] = roots
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((root) => {
      const continuation = rootToContinuation.get(root.id);
      const rootAccount = root.trading_account_id ? accountById.get(root.trading_account_id) : null;

      const matchingPurchase = purchaseRows.find((p) => Math.abs(new Date(p.created_at).getTime() - new Date(root.created_at).getTime()) < 5 * 60 * 1000)
        ?? purchaseRows.find((p) => new Date(p.created_at) <= new Date(root.created_at));

      const timeline: TimelineStep[] = [
        { label: "Challenge Purchased", timestamp: matchingPurchase?.created_at ?? null, reached: !!matchingPurchase },
        { label: "Payment Confirmed", timestamp: matchingPurchase?.payment_status === "completed" ? matchingPurchase.created_at : null, reached: matchingPurchase?.payment_status === "completed" },
        { label: "Inventory Assigned", timestamp: rootAccount?.assigned_at ?? root.created_at, reached: !!root.trading_account_id },
        { label: "Credentials Sent", timestamp: rootAccount?.assigned_at ?? root.created_at, reached: !!root.trading_account_id },
        { label: "Started Trading", timestamp: root.created_at, reached: true },
        { label: "Passed Phase 1", timestamp: root.phase1_passed_at, reached: !!root.phase1_passed_at || root.current_phase >= 2 || root.status === "passed" },
        { label: "Passed Phase 2", timestamp: root.status === "passed" ? root.completed_at : null, reached: root.status === "passed" },
        { label: "Funded", timestamp: continuation?.created_at ?? null, reached: !!continuation },
      ];

      const journeyPayouts = continuation
        ? payoutRows.filter((p) => new Date(p.requested_at) >= new Date(continuation.created_at))
        : [];

      journeyPayouts.forEach((p, i) => {
        timeline.push({ label: `Payout ${i + 1}`, timestamp: p.requested_at, reached: true });
        if (p.processed_at) {
          timeline.push({ label: `Balance Reset (after Payout ${i + 1})`, timestamp: p.processed_at, reached: true });
        }
      });

      if (root.status === "failed") {
        timeline.push({ label: "Retired (Failed)", timestamp: root.completed_at, reached: true });
      } else if (continuation && continuation.status === "failed") {
        timeline.push({ label: "Retired (Failed)", timestamp: continuation.completed_at, reached: true });
      }

      const journeyAccounts = [root, continuation].filter(Boolean).map((c) => {
        const account = c.trading_account_id ? accountById.get(c.trading_account_id) : null;
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
      });

      const label = `${rootAccount?.account_size ? `₦${Number(rootAccount.account_size).toLocaleString()}` : root.challenge_id} — Started ${new Date(root.created_at).toLocaleDateString()}`;

      return { id: root.id, label, timeline, assignedAccounts: journeyAccounts };
    });

  const hasRuleViolation = challenges.some((c) => c.status === "failed" || c.hold_time_warnings_notified > 0 || c.drawdown_warning_sent || c.weekend_hold_warnings > 0)
    || (correlationQuery.data && correlationQuery.data.length > 0);

  const alerts: Alert[] = [
    { label: "Failed Login Attempts", active: false, detail: "Not tracked yet", linkedTab: null },
    { label: "Payment Dispute", active: false, detail: "Not tracked yet", linkedTab: null },
    { label: "Rule Violation", active: !!hasRuleViolation, detail: hasRuleViolation ? "Warning, breach, or correlation flag on record" : "None", linkedTab: "Journeys" },
    { label: "KYC Pending", active: profile.kyc_status === "pending", detail: profile.kyc_status, linkedTab: "Profile" },
    { label: "Awaiting Payout", active: outstandingPayout > 0, detail: outstandingPayout > 0 ? `₦${outstandingPayout.toLocaleString()} pending` : "None", linkedTab: "Financial" },
  ];

  const events: ActivityEvent[] = [];
  for (const p of purchaseRows) {
    events.push({ text: `Purchased ${p.challenge_size} Challenge`, timestamp: p.created_at });
    if (p.payment_status === "completed") {
      events.push({ text: "Payment confirmed", timestamp: p.created_at });
    }
  }
  for (const root of roots) {
    const rootAccount = root.trading_account_id ? accountById.get(root.trading_account_id) : null;
    if (root.trading_account_id) {
      events.push({ text: "Account assigned", timestamp: rootAccount?.assigned_at ?? root.created_at });
      events.push({ text: "Credentials emailed", timestamp: rootAccount?.assigned_at ?? root.created_at });
    }
    if (root.phase1_passed_at) events.push({ text: "Passed Phase 1", timestamp: root.phase1_passed_at });
    if (root.status === "passed") events.push({ text: "Passed Phase 2", timestamp: root.completed_at });
    if (root.status === "failed") events.push({ text: "Challenge failed", timestamp: root.completed_at });
  }
  for (const cont of continuations) {
    events.push({ text: "Became a funded trader", timestamp: cont.created_at });
    if (cont.status === "failed") events.push({ text: "Funded account failed", timestamp: cont.completed_at });
  }
  for (const p of payoutRows) {
    events.push({ text: `Requested payout of ₦${Number(p.amount).toLocaleString()}`, timestamp: p.requested_at });
    if (p.status === "approved" || p.status === "completed") {
      events.push({ text: "Payout approved", timestamp: p.processed_at ?? p.requested_at });
    }
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
      kyc_status: profile.kyc_status,
      signupIpAddress: profile.signup_ip_address ?? null,
      signupDeviceSummary: profile.signup_device_summary ?? null,
      signupCapturedAt: profile.signup_captured_at ?? null,
    },
    journeys,
    alerts,
    activityFeed: events,
    financialSummary: {
      totalChallengePurchases: purchaseRows.length,
      totalRevenue,
      refunds: refundsTotal,
      payoutsPaid,
      outstandingPayout,
      netRevenue: totalRevenue - refundsTotal - payoutsPaid,
    },
    isAwaitingProvisioning: challenges.some((c) => c.status === "awaiting_allocation"),
  };
}
