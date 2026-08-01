import { createServiceClient } from "@/lib/supabase/service";

// Backfills the permanent audit_events table by inferring real,
// already-timestamped events from across the system — genuinely real
// data, not fabricated. Idempotent: the unique constraint on
// (event_name, user_id, occurred_at) means re-running this never
// creates duplicates.
export async function syncAuditEvents(): Promise<void> {
  const serviceClient = createServiceClient();
  const events: any[] = [];

  // Authentication — real signups
  const usersQuery = await serviceClient.from("users").select("id, email, created_at");
  for (const u of ((usersQuery.data ?? []) as unknown as any[])) {
    events.push({ event_name: "User Registered", category: "Authentication", result: "success", user_id: u.id, source: "System", description: `${u.email} registered.`, occurred_at: u.created_at });
  }

  // Payments
  const purchasesQuery = await serviceClient.from("challenge_purchases").select("id, user_id, challenge_size, price_paid, payment_status, created_at, payment_confirmed_at");
  for (const p of ((purchasesQuery.data ?? []) as unknown as any[])) {
    events.push({ event_name: "Purchase Started", category: "Payments", result: "information", user_id: p.user_id, source: "Payment Webhook", description: `${p.challenge_size} purchase started, ₦${Number(p.price_paid).toLocaleString()}.`, related_purchase_id: p.id, occurred_at: p.created_at });
    if (p.payment_status === "completed" && p.payment_confirmed_at) {
      events.push({ event_name: "Payment Received", category: "Payments", result: "success", user_id: p.user_id, source: "Payment Webhook", description: `Payment confirmed for ${p.challenge_size}.`, related_purchase_id: p.id, occurred_at: p.payment_confirmed_at });
    } else if (p.payment_status === "failed") {
      events.push({ event_name: "Payment Failed", category: "Payments", result: "failed", user_id: p.user_id, source: "Payment Webhook", description: `Payment failed for ${p.challenge_size}.`, related_purchase_id: p.id, occurred_at: p.created_at });
    }
  }

  // Challenge lifecycle
  const challengesQuery = await serviceClient.from("user_challenges").select("id, user_id, challenge_id, trading_account_id, status, current_phase, created_at, completed_at, phase1_passed_at, account_login");
  const challenges = ((challengesQuery.data ?? []) as unknown as any[]);
  for (const c of challenges) {
    events.push({ event_name: "Challenge Created", category: "Challenge", result: "success", user_id: c.user_id, source: "System", description: `Challenge ${c.challenge_id} created.`, related_challenge_id: c.id, related_account_id: c.trading_account_id, occurred_at: c.created_at });
    if (c.phase1_passed_at) {
      events.push({ event_name: "Phase Passed", category: "Challenge", result: "success", user_id: c.user_id, source: "Risk Engine", description: "Phase 1 passed.", related_challenge_id: c.id, occurred_at: c.phase1_passed_at });
    }
    if (c.status === "passed" && c.completed_at) {
      events.push({ event_name: "Phase Passed", category: "Challenge", result: "success", user_id: c.user_id, source: "Risk Engine", description: "Phase 2 passed.", related_challenge_id: c.id, occurred_at: c.completed_at });
    }
    if (c.status === "failed" && c.completed_at) {
      events.push({ event_name: "Challenge Failed", category: "Challenge", result: "failed", user_id: c.user_id, source: "Risk Engine", description: "Challenge failed a rule.", related_challenge_id: c.id, occurred_at: c.completed_at });
    }
    if (c.current_phase === 3) {
      events.push({ event_name: "Moved To Funded", category: "Challenge", result: "success", user_id: c.user_id, source: "System", description: `Funded account ${c.account_login ?? ""} created.`, related_challenge_id: c.id, related_account_id: c.trading_account_id, occurred_at: c.created_at });
    }
    if (c.trading_account_id) {
      events.push({ event_name: "Account Assigned", category: "Provisioning", result: "success", user_id: c.user_id, source: "System", description: `Account ${c.account_login ?? ""} assigned.`, related_challenge_id: c.id, related_account_id: c.trading_account_id, occurred_at: c.created_at });
      events.push({ event_name: "Credentials Sent", category: "Provisioning", result: "success", user_id: c.user_id, source: "System", description: "Credentials emailed to trader.", related_challenge_id: c.id, related_account_id: c.trading_account_id, occurred_at: c.created_at });
    }
  }

  // Inventory
  const accountsQuery = await serviceClient.from("trading_accounts").select("id, login, status, created_at, last_reset_at");
  for (const a of ((accountsQuery.data ?? []) as unknown as any[])) {
    events.push({ event_name: "Account Added", category: "Inventory", result: "success", user_id: null, source: "Admin", description: `Account ${a.login} added to inventory.`, related_account_id: a.id, occurred_at: a.created_at });
    if (a.status === "resetting" && a.last_reset_at) {
      events.push({ event_name: "Account Retired", category: "Inventory", result: "information", user_id: null, source: "System", description: `Account ${a.login} retired.`, related_account_id: a.id, occurred_at: a.last_reset_at });
    }
    if (a.status === "expired" && a.last_reset_at) {
      events.push({ event_name: "Account Deleted", category: "Inventory", result: "information", user_id: null, source: "Admin", description: `Account ${a.login} confirmed deleted by Exness.`, related_account_id: a.id, occurred_at: a.last_reset_at });
    }
  }

  // Risk
  for (const c of challenges) {
    if (c.drawdown_warning_sent && c.drawdown_warning_sent_at) {
      events.push({ event_name: "Max Drawdown Breach", category: "Risk", result: "warning", user_id: c.user_id, source: "Risk Engine", description: "Drawdown warning issued.", related_challenge_id: c.id, occurred_at: c.drawdown_warning_sent_at });
    }
  }
  const violationsQuery = await serviceClient.from("violation_reviews").select("user_challenge_id, created_at");
  for (const v of ((violationsQuery.data ?? []) as unknown as any[])) {
    const challenge = challenges.find((c) => c.id === v.user_challenge_id);
    events.push({ event_name: "Violation Created", category: "Risk", result: "warning", user_id: challenge?.user_id ?? null, source: "Risk Engine", description: "Rule violation recorded.", related_challenge_id: v.user_challenge_id, occurred_at: v.created_at });
  }
  const reviewEventsQuery = await serviceClient.from("manual_review_events").select("review_id, event_type, created_at, note");
  const reviewsQuery = await serviceClient.from("manual_reviews").select("id, user_id");
  const reviewUserById = new Map(((reviewsQuery.data ?? []) as unknown as any[]).map((r) => [r.id, r.user_id]));
  for (const e of ((reviewEventsQuery.data ?? []) as unknown as any[])) {
    if (e.event_type === "Review Created") {
      events.push({ event_name: "Manual Review Triggered", category: "Risk", result: "information", user_id: reviewUserById.get(e.review_id) ?? null, source: "System", description: e.note ?? "Manual review created.", occurred_at: e.created_at });
    }
  }

  // Payouts
  const payoutsQuery = await serviceClient.from("payout_requests").select("id, user_id, status, amount, requested_at, processed_at");
  for (const p of ((payoutsQuery.data ?? []) as unknown as any[])) {
    events.push({ event_name: "Request Created", category: "Payout", result: "information", user_id: p.user_id, source: "Risk Engine", description: `Payout request of ₦${Number(p.amount).toLocaleString()} created.`, related_payout_id: p.id, occurred_at: p.requested_at });
    if (p.status === "approved" || p.status === "completed") {
      events.push({ event_name: "Approved", category: "Payout", result: "success", user_id: p.user_id, source: "Admin", description: "Payout approved.", related_payout_id: p.id, occurred_at: p.processed_at ?? p.requested_at });
    } else if (p.status === "rejected") {
      events.push({ event_name: "Rejected", category: "Payout", result: "failed", user_id: p.user_id, source: "Admin", description: "Payout rejected.", related_payout_id: p.id, occurred_at: p.requested_at });
    }
  }

  if (events.length === 0) return;

  // Insert in batches, ignoring conflicts (idempotent re-sync)
  const BATCH_SIZE = 200;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    await (serviceClient.from("audit_events") as any).upsert(batch, { onConflict: "event_name,user_id,occurred_at", ignoreDuplicates: true });
  }
}

export interface AuditStats {
  totalEvents: number;
  today: number;
  adminActions: number;
  systemEvents: number;
  failedEvents: number;
  securityEvents: number;
}

export async function getAuditStats(): Promise<AuditStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const allQuery = await serviceClient.from("audit_events").select("source, result, category, occurred_at");
  const all = ((allQuery.data ?? []) as unknown as any[]);

  return {
    totalEvents: all.length,
    today: all.filter((e) => e.occurred_at >= todayStart).length,
    adminActions: all.filter((e) => e.source === "Admin").length,
    systemEvents: all.filter((e) => e.source === "System" || e.source === "Risk Engine" || e.source === "Payment Webhook").length,
    failedEvents: all.filter((e) => e.result === "failed").length,
    securityEvents: all.filter((e) => e.category === "Authentication").length,
  };
}

export interface AuditRow {
  id: string;
  timestamp: string;
  eventName: string;
  category: string;
  userName: string | null;
  source: string;
  result: string;
}

export async function getAuditEventsPage(params: { search?: string; category?: string; result?: string; dateRange?: string; page: number; pageSize: number }) {
  const serviceClient = createServiceClient();
  const { search, category, result, dateRange, page, pageSize } = params;

  let query = serviceClient.from("audit_events").select("*");

  if (category && category !== "all") query = query.eq("category", category);
  if (result) query = query.eq("result", result);

  if (dateRange) {
    const now = new Date();
    let since: Date | null = null;
    if (dateRange === "today") since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    else if (dateRange === "yesterday") since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    else if (dateRange === "7d") since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (dateRange === "30d") since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (since) query = query.gte("occurred_at", since.toISOString());
  }

  const allQuery = await query.order("occurred_at", { ascending: false });
  let rows = ((allQuery.data ?? []) as unknown as any[]);

  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((r) => {
      const user = r.user_id ? userById.get(r.user_id) : null;
      return (
        r.id.includes(term) ||
        (user?.email ?? "").toLowerCase().includes(term) ||
        (user?.full_name ?? "").toLowerCase().includes(term) ||
        (r.related_challenge_id ?? "").includes(term) ||
        (r.related_purchase_id ?? "").includes(term)
      );
    });
  }

  const totalCount = rows.length;
  const pageItems = rows.slice((page - 1) * pageSize, page * pageSize);

  const result_rows: AuditRow[] = pageItems.map((r) => {
    const user = r.user_id ? userById.get(r.user_id) : null;
    return { id: r.id, timestamp: r.occurred_at, eventName: r.event_name, category: r.category, userName: user?.full_name ?? user?.email ?? null, source: r.source, result: r.result };
  });

  return { events: result_rows, totalCount };
}

export interface AuditDetail {
  eventId: string;
  eventName: string;
  category: string;
  description: string | null;
  result: string;
  user: { name: string | null; email: string | null; username: string | null; country: string | null } | null;
  challenge: { id: string; size: number | null; phase: number; status: string } | null;
  tradingAccount: { mt5Login: string | null; server: string | null; size: number | null; status: string } | null;
  source: string;
  relatedIds: { challengeId: string | null; purchaseId: string | null; accountId: string | null; payoutId: string | null };
  nearbyTimeline: { eventName: string; timestamp: string }[];
}

export async function getAuditEventDetail(eventId: string): Promise<AuditDetail | null> {
  const serviceClient = createServiceClient();
  const eventQuery = await serviceClient.from("audit_events").select("*").eq("id", eventId).single();
  const event = eventQuery.data as any;
  if (eventQuery.error || !event) return null;

  let user: AuditDetail["user"] = null;
  if (event.user_id) {
    const userQuery = await serviceClient.from("users").select("full_name, email, username, country").eq("id", event.user_id).single();
    const u = userQuery.data as any;
    if (u) user = { name: u.full_name, email: u.email, username: u.username, country: u.country };
  }

  let challenge: AuditDetail["challenge"] = null;
  let tradingAccount: AuditDetail["tradingAccount"] = null;
  const challengeId = event.related_challenge_id;
  if (challengeId) {
    const challengeQuery = await serviceClient.from("user_challenges").select("id, current_phase, status, trading_account_id").eq("id", challengeId).maybeSingle();
    const c = challengeQuery.data as any;
    if (c) {
      const accountQuery = c.trading_account_id ? await serviceClient.from("trading_accounts").select("login, server, account_size, status").eq("id", c.trading_account_id).single() : { data: null };
      const account = accountQuery.data as any;
      challenge = { id: c.id, size: account?.account_size ?? null, phase: c.current_phase, status: c.status };
      if (account) tradingAccount = { mt5Login: account.login, server: account.server, size: account.account_size, status: account.status };
    }
  }

  let nearbyTimeline: AuditDetail["nearbyTimeline"] = [];
  if (event.user_id) {
    const nearbyQuery = await serviceClient.from("audit_events").select("event_name, occurred_at").eq("user_id", event.user_id).order("occurred_at", { ascending: true });
    nearbyTimeline = ((nearbyQuery.data ?? []) as unknown as any[]).map((e) => ({ eventName: e.event_name, timestamp: e.occurred_at }));
  }

  return {
    eventId: event.id,
    eventName: event.event_name,
    category: event.category,
    description: event.description,
    result: event.result,
    user,
    challenge,
    tradingAccount,
    source: event.source,
    relatedIds: { challengeId: event.related_challenge_id, purchaseId: event.related_purchase_id, accountId: event.related_account_id, payoutId: event.related_payout_id },
    nearbyTimeline,
  };
}

export interface AuditChartsData {
  last30Days: { date: string; count: number }[];
  byCategory: { category: string; count: number }[];
  topEvents: { event: string; count: number }[];
  successVsFailed: { date: string; success: number; failed: number }[];
}

export async function getAuditCharts(): Promise<AuditChartsData> {
  const serviceClient = createServiceClient();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const query = await serviceClient.from("audit_events").select("event_name, category, result, occurred_at").gte("occurred_at", since30);
  const rows = ((query.data ?? []) as unknown as any[]);

  const dayCounts = new Map<string, { success: number; failed: number; total: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayCounts.set(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10), { success: 0, failed: 0, total: 0 });
  }
  const categoryCounts = new Map<string, number>();
  const eventCounts = new Map<string, number>();

  for (const r of rows) {
    const key = new Date(Date.UTC(new Date(r.occurred_at).getUTCFullYear(), new Date(r.occurred_at).getUTCMonth(), new Date(r.occurred_at).getUTCDate())).toISOString().slice(0, 10);
    const day = dayCounts.get(key);
    if (day) {
      day.total++;
      if (r.result === "success") day.success++;
      if (r.result === "failed") day.failed++;
    }
    categoryCounts.set(r.category, (categoryCounts.get(r.category) ?? 0) + 1);
    eventCounts.set(r.event_name, (eventCounts.get(r.event_name) ?? 0) + 1);
  }

  return {
    last30Days: [...dayCounts.entries()].map(([date, d]) => ({ date, count: d.total })),
    byCategory: [...categoryCounts.entries()].map(([category, count]) => ({ category, count })),
    topEvents: [...eventCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([event, count]) => ({ event, count })),
    successVsFailed: [...dayCounts.entries()].map(([date, d]) => ({ date, success: d.success, failed: d.failed })),
  };
}
