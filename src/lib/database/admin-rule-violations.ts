import { createServiceClient } from "@/lib/supabase/service";

export interface ViolationStats {
  totalViolations: number;
  today: number;
  maxDrawdownBreach: number;
  pendingReview: number;
}

export type ReviewStatus = "pending_review" | "reviewed" | "escalated" | "resolved";

export interface ViolationRow {
  challengeId: string;
  violationDate: string | null;
  traderName: string | null;
  email: string;
  accountSize: number | null;
  accountLogin: string | null;
  ruleBroken: string;
  actualValue: string;
  allowedValue: string;
  reviewStatus: ReviewStatus;
}

export interface ViolationListResult {
  violations: ViolationRow[];
  totalCount: number;
}

export interface TimelineStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
}

export interface ViolationDetail {
  trader: { name: string | null; email: string; username: string | null; country: string | null };
  challenge: { challengeId: string; accountSize: number | null; phase: number; startDate: string | null; failureDate: string | null };
  tradingAccount: { mt5Login: string | null; server: string | null; currentBalance: number | null; currentEquity: number | null; highestEquity: number | null };
  violation: { ruleBroken: string; actualValue: string; allowedValue: string; difference: string; triggerTime: string | null; openTradesAtViolation: number | null; source: string };
  timeline: TimelineStep[];
  reviewStatus: ReviewStatus;
  adminNotes: string;
}

const REVIEW_NOTIFICATION_TITLES = ["Drawdown Breach Detected", "Weekend Holding Breach", "News Trading Violation", "Challenge Failed"];

function computeDrawdownAtBreach(challenge: any): { actual: string; allowed: string; diff: string } {
  const peak = challenge.peak_closed_balance;
  const equity = challenge.last_known_equity;
  const accountSize = challenge._accountSize;
  const limit = Number(challenge.drawdown_limit);

  if (peak === null || equity === null || !accountSize) {
    return { actual: "—", allowed: `-${limit}%`, diff: "—" };
  }
  const lossPercent = ((peak - equity) / accountSize) * 100;
  return {
    actual: `-${lossPercent.toFixed(2)}%`,
    allowed: `-${limit}%`,
    diff: `${(lossPercent - limit).toFixed(2)}%`,
  };
}

async function determineRule(
  serviceClient: ReturnType<typeof createServiceClient>,
  challenge: any,
  notificationsByChallenge: Map<string, { title: string; message: string }[]>
): Promise<{ rule: string; source: string; actual: string; allowed: string; diff: string }> {
  const matches = notificationsByChallenge.get(challenge.id) ?? [];

  const drawdown = matches.find((n) => n.title === "Drawdown Breach Detected");
  if (drawdown) {
    const { actual, allowed, diff } = computeDrawdownAtBreach(challenge);
    return { rule: "Max Drawdown", source: "Risk Engine", actual, allowed, diff };
  }

  const weekend = matches.find((n) => n.title === "Weekend Holding Breach");
  if (weekend) {
    return { rule: "Weekend Holding", source: "Risk Engine", actual: "2nd occurrence", allowed: "1 warning max", diff: "1 over limit" };
  }

  const news = matches.find((n) => n.title === "News Trading Violation");
  if (news) {
    return { rule: "News Trading", source: "Risk Engine", actual: "Traded within 4-min window", allowed: "No trade within 4-min window", diff: "—" };
  }

  const generic = matches.find((n) => n.title === "Challenge Failed");
  if (generic) {
    const match = generic.message.match(/failed rule "([^"]+)"/);
    const ruleKey = match?.[1];
    if (ruleKey === "min_hold_time") {
      return { rule: "Minimum Hold Time", source: "Risk Engine", actual: `${challenge.hold_time_warnings_notified ?? 4}th violation`, allowed: "3 warnings max", diff: "1 over limit" };
    }
    if (ruleKey === "inactivity") {
      return { rule: "Inactivity", source: "Risk Engine", actual: "5+ days inactive", allowed: "5 days max", diff: "—" };
    }
    return { rule: ruleKey ?? "Rule Violation", source: "Risk Engine", actual: "—", allowed: "—", diff: "—" };
  }

  return { rule: "Not Recorded", source: "Unknown", actual: "—", allowed: "—", diff: "—" };
}

async function getNotificationsByChallenge(serviceClient: ReturnType<typeof createServiceClient>, challenges: any[]) {
  const map = new Map<string, { title: string; message: string }[]>();
  if (challenges.length === 0) return map;

  const query = await serviceClient
    .from("notifications")
    .select("title, message")
    .in("title", REVIEW_NOTIFICATION_TITLES);
  const allNotifications = ((query.data ?? []) as unknown as { title: string; message: string }[]);

  for (const c of challenges) {
    const matches = allNotifications.filter((n) => n.message.includes(c.id) || (c.account_login && n.message.includes(c.account_login)));
    map.set(c.id, matches);
  }
  return map;
}

async function getReviewsMap(serviceClient: ReturnType<typeof createServiceClient>, challengeIds: string[]) {
  if (challengeIds.length === 0) return new Map<string, { review_status: ReviewStatus; admin_notes: string | null }>();
  const query = await serviceClient.from("violation_reviews").select("user_challenge_id, review_status, admin_notes").in("user_challenge_id", challengeIds);
  return new Map(((query.data ?? []) as unknown as any[]).map((r) => [r.user_challenge_id, r]));
}

export async function getViolationStats(): Promise<ViolationStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const failedQuery = await serviceClient.from("user_challenges").select("id, account_login, completed_at, peak_closed_balance, last_known_equity, drawdown_limit, hold_time_warnings_notified, trading_account_id").eq("status", "failed");
  const failedRows = ((failedQuery.data ?? []) as unknown as any[]);

  const accountIds = [...new Set(failedRows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0 ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds) : { data: [] as any[] };
  const sizeById = new Map(((accountsQuery.data ?? []) as unknown as any[]).map((a) => [a.id, a.account_size]));
  for (const r of failedRows) r._accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;

  const notifMap = await getNotificationsByChallenge(serviceClient, failedRows);

  let maxDrawdownCount = 0;
  for (const r of failedRows) {
    const { rule } = await determineRule(serviceClient, r, notifMap);
    if (rule === "Max Drawdown") maxDrawdownCount++;
  }

  const reviewsMap = await getReviewsMap(serviceClient, failedRows.map((r) => r.id));
  const pendingReview = failedRows.filter((r) => (reviewsMap.get(r.id)?.review_status ?? "pending_review") === "pending_review").length;

  return {
    totalViolations: failedRows.length,
    today: failedRows.filter((r) => r.completed_at && r.completed_at >= todayStart).length,
    maxDrawdownBreach: maxDrawdownCount,
    pendingReview,
  };
}

export async function getViolationsPage(params: { search?: string; filter?: string; page: number; pageSize: number }): Promise<ViolationListResult> {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const term = search.trim();
    const usersQuery = await serviceClient.from("users").select("id").or(`email.ilike.%${term}%,full_name.ilike.%${term}%,username.ilike.%${term}%`);
    matchingUserIds = ((usersQuery.data ?? []) as unknown as { id: string }[]).map((u) => u.id);
  }

  let query = serviceClient.from("user_challenges").select("*").eq("status", "failed");
  if (search && search.trim()) {
    const term = search.trim();
    const orParts = [`account_login.ilike.%${term}%`, `id.eq.${term}`];
    if (matchingUserIds && matchingUserIds.length > 0) orParts.push(`user_id.in.(${matchingUserIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const allQuery = await query.order("completed_at", { ascending: false, nullsFirst: false });
  const rows = ((allQuery.data ?? []) as unknown as any[]);

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0 ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds) : { data: [] as any[] };
  const sizeById = new Map(((accountsQuery.data ?? []) as unknown as any[]).map((a) => [a.id, a.account_size]));
  for (const r of rows) r._accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;

  const notifMap = await getNotificationsByChallenge(serviceClient, rows);
  const reviewsMap = await getReviewsMap(serviceClient, rows.map((r) => r.id));

  let violations: ViolationRow[] = [];
  for (const r of rows) {
    const { rule, actual, allowed } = await determineRule(serviceClient, r, notifMap);
    const user = userById.get(r.user_id);
    const review = reviewsMap.get(r.id);

    violations.push({
      challengeId: r.id,
      violationDate: r.completed_at,
      traderName: user?.full_name ?? user?.email ?? null,
      email: user?.email ?? "unknown",
      accountSize: r._accountSize,
      accountLogin: r.account_login,
      ruleBroken: rule,
      actualValue: actual,
      allowedValue: allowed,
      reviewStatus: review?.review_status ?? "pending_review",
    });
  }

  const ruleFilterMap: Record<string, string> = { max_drawdown: "Max Drawdown", weekend: "Weekend Holding", news: "News Trading", hold_time: "Minimum Hold Time", inactivity: "Inactivity" };
  if (ruleFilterMap[filter]) violations = violations.filter((v) => v.ruleBroken === ruleFilterMap[filter]);
  else if (filter === "reviewed") violations = violations.filter((v) => v.reviewStatus === "reviewed" || v.reviewStatus === "resolved");
  else if (filter === "pending_review") violations = violations.filter((v) => v.reviewStatus === "pending_review");

  const totalCount = violations.length;
  const pageItems = violations.slice((page - 1) * pageSize, page * pageSize);

  return { violations: pageItems, totalCount };
}

export async function getViolationDetail(challengeId: string): Promise<ViolationDetail | null> {
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("*").eq("id", challengeId).single();
  const challenge = challengeQuery.data as any;
  if (challengeQuery.error || !challenge) return null;

  const userQuery = await serviceClient.from("users").select("full_name, email, username, country").eq("id", challenge.user_id).single();
  const user = userQuery.data as any;

  const accountQuery = challenge.trading_account_id
    ? await serviceClient.from("trading_accounts").select("account_size, server").eq("id", challenge.trading_account_id).single()
    : { data: null };
  const account = accountQuery.data as any;
  challenge._accountSize = account?.account_size ?? null;

  const notifMap = await getNotificationsByChallenge(serviceClient, [challenge]);
  const { rule, source, actual, allowed, diff } = await determineRule(serviceClient, challenge, notifMap);

  const reviewsMap = await getReviewsMap(serviceClient, [challenge.id]);
  const review = reviewsMap.get(challenge.id);

  const isRetired = true; // failed challenges always trigger retirement via complete_user_challenge

  const timeline: TimelineStep[] = [
    { label: "Challenge Started", timestamp: challenge.start_date ?? challenge.created_at, reached: true },
    { label: "Trading Began", timestamp: challenge.start_date ?? challenge.created_at, reached: true },
    { label: "Violation Detected", timestamp: challenge.completed_at, reached: true },
    { label: "Challenge Failed", timestamp: challenge.completed_at, reached: true },
    { label: "Account Retired", timestamp: challenge.completed_at, reached: isRetired },
  ];

  return {
    trader: { name: user?.full_name ?? null, email: user?.email ?? "unknown", username: user?.username ?? null, country: user?.country ?? null },
    challenge: { challengeId: challenge.id, accountSize: challenge._accountSize, phase: challenge.current_phase, startDate: challenge.start_date, failureDate: challenge.completed_at },
    tradingAccount: {
      mt5Login: challenge.account_login,
      server: account?.server ?? null,
      currentBalance: challenge.last_known_balance,
      currentEquity: challenge.last_known_equity,
      highestEquity: challenge.peak_closed_balance,
    },
    violation: {
      ruleBroken: rule,
      actualValue: actual,
      allowedValue: allowed,
      difference: diff,
      triggerTime: challenge.completed_at,
      openTradesAtViolation: challenge.last_known_open_trades,
      source,
    },
    timeline,
    reviewStatus: review?.review_status ?? "pending_review",
    adminNotes: review?.admin_notes ?? "",
  };
}

export interface ChartsData {
  last30Days: { date: string; count: number }[];
  ruleBreakdown: { rule: string; count: number }[];
  sizeVsFailures: { size: string; count: number }[];
}

export async function getViolationCharts(): Promise<ChartsData> {
  const serviceClient = createServiceClient();

  const query = await serviceClient.from("user_challenges").select("id, account_login, completed_at, peak_closed_balance, last_known_equity, drawdown_limit, hold_time_warnings_notified, trading_account_id").eq("status", "failed");
  const rows = ((query.data ?? []) as unknown as any[]);

  const accountIds = [...new Set(rows.map((r) => r.trading_account_id).filter(Boolean))];
  const accountsQuery = accountIds.length > 0 ? await serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds) : { data: [] as any[] };
  const sizeById = new Map(((accountsQuery.data ?? []) as unknown as any[]).map((a) => [a.id, a.account_size]));
  for (const r of rows) r._accountSize = r.trading_account_id ? sizeById.get(r.trading_account_id) ?? null : null;

  const notifMap = await getNotificationsByChallenge(serviceClient, rows);

  const dayCounts = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayCounts.set(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10), 0);
  }
  const ruleCounts = new Map<string, number>();
  const sizeCounts = new Map<number, number>();

  for (const r of rows) {
    const { rule } = await determineRule(serviceClient, r, notifMap);
    ruleCounts.set(rule, (ruleCounts.get(rule) ?? 0) + 1);

    if (r._accountSize) sizeCounts.set(r._accountSize, (sizeCounts.get(r._accountSize) ?? 0) + 1);

    if (r.completed_at) {
      const key = new Date(Date.UTC(new Date(r.completed_at).getUTCFullYear(), new Date(r.completed_at).getUTCMonth(), new Date(r.completed_at).getUTCDate())).toISOString().slice(0, 10);
      if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }

  return {
    last30Days: [...dayCounts.entries()].map(([date, count]) => ({ date, count })),
    ruleBreakdown: [...ruleCounts.entries()].map(([rule, count]) => ({ rule, count })),
    sizeVsFailures: [...sizeCounts.entries()].sort((a, b) => a[0] - b[0]).map(([size, count]) => ({ size: `₦${size.toLocaleString()}`, count })),
  };
}
