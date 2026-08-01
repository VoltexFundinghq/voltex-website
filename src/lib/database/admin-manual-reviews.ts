import { createServiceClient } from "@/lib/supabase/service";

const STALE_VPS_SECONDS = 300;
const STUCK_PAYMENT_MINUTES = 30;
const STUCK_PROVISIONING_MINUTES = 60;

type SourceType = "payment" | "provisioning" | "kyc" | "payout" | "vps" | "risk" | "account_mismatch";

interface DetectedCase {
  sourceType: SourceType;
  sourceId: string;
  userId: string | null;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  reason: string;
  description: string;
}

// Real, defensible default priorities per source — adjustable per-case
// afterward via "Change Priority", not treated as fixed forever.
const CATEGORY_MAP: Record<SourceType, string> = {
  payment: "Payments",
  provisioning: "Provisioning",
  kyc: "KYC",
  payout: "Payout",
  vps: "VPS",
  risk: "Risk",
  account_mismatch: "Trading",
};

async function detectCases(serviceClient: ReturnType<typeof createServiceClient>): Promise<DetectedCase[]> {
  const cases: DetectedCase[] = [];
  const now = Date.now();

  // Stuck payments — pending past a reasonable window
  const stuckPaymentCutoff = new Date(now - STUCK_PAYMENT_MINUTES * 60 * 1000).toISOString();
  const paymentsQuery = await serviceClient
    .from("challenge_purchases")
    .select("id, user_id, price_paid, created_at")
    .eq("payment_status", "pending")
    .lte("created_at", stuckPaymentCutoff);
  for (const p of ((paymentsQuery.data ?? []) as unknown as any[])) {
    cases.push({
      sourceType: "payment", sourceId: p.id, userId: p.user_id, category: CATEGORY_MAP.payment,
      priority: "medium", reason: "Payment stuck pending",
      description: `₦${Number(p.price_paid).toLocaleString()} payment created ${new Date(p.created_at).toLocaleString()} still shows pending after ${STUCK_PAYMENT_MINUTES}+ minutes.`,
    });
  }

  // Stuck provisioning
  const stuckProvCutoff = new Date(now - STUCK_PROVISIONING_MINUTES * 60 * 1000).toISOString();
  const provQuery = await serviceClient
    .from("user_challenges")
    .select("id, user_id, challenge_id, created_at")
    .eq("status", "awaiting_allocation")
    .lte("created_at", stuckProvCutoff);
  for (const c of ((provQuery.data ?? []) as unknown as any[])) {
    cases.push({
      sourceType: "provisioning", sourceId: c.id, userId: c.user_id, category: CATEGORY_MAP.provisioning,
      priority: "medium", reason: "No inventory available for allocation",
      description: `Challenge ${c.challenge_id} has been waiting for allocation since ${new Date(c.created_at).toLocaleString()}.`,
    });
  }

  // Pending KYC
  const kycQuery = await serviceClient.from("users").select("id, email, kyc_status").eq("kyc_status", "pending");
  for (const u of ((kycQuery.data ?? []) as unknown as any[])) {
    cases.push({
      sourceType: "kyc", sourceId: u.id, userId: u.id, category: CATEGORY_MAP.kyc,
      priority: "low", reason: "KYC verification pending", description: `${u.email} has a pending KYC verification requiring review.`,
    });
  }

  // Pending payouts
  const payoutQuery = await serviceClient.from("payout_requests").select("id, user_id, amount, requested_at").eq("status", "pending");
  for (const p of ((payoutQuery.data ?? []) as unknown as any[])) {
    cases.push({
      sourceType: "payout", sourceId: p.id, userId: p.user_id, category: CATEGORY_MAP.payout,
      priority: "medium", reason: "Payout awaiting approval",
      description: `Payout request of ₦${Number(p.amount).toLocaleString()} requested ${new Date(p.requested_at).toLocaleString()} awaiting review.`,
    });
  }

  // Stale VPS heartbeats on active accounts
  const vpsQuery = await serviceClient
    .from("user_challenges")
    .select("id, user_id, account_login, last_known_check_at")
    .eq("status", "active");
  for (const c of ((vpsQuery.data ?? []) as unknown as any[])) {
    const isStale = !c.last_known_check_at || (now - new Date(c.last_known_check_at).getTime()) > STALE_VPS_SECONDS * 1000;
    if (isStale) {
      cases.push({
        sourceType: "vps", sourceId: c.id, userId: c.user_id, category: CATEGORY_MAP.vps,
        priority: "high", reason: "VPS connection lost",
        description: `Account ${c.account_login} has not reported a heartbeat in over ${STALE_VPS_SECONDS / 60} minutes.`,
      });
    }
  }

  // Correlation flags (risk engine)
  const riskQuery = await serviceClient.from("correlation_flags").select("id, user_a_id, trade_a_symbol, trade_b_symbol, created_at").eq("status", "pending_review");
  for (const f of ((riskQuery.data ?? []) as unknown as any[])) {
    cases.push({
      sourceType: "risk", sourceId: f.id, userId: f.user_a_id ?? null, category: CATEGORY_MAP.risk,
      priority: "high", reason: "Correlation flag raised",
      description: `Potential correlated trading detected (${f.trade_a_symbol ?? "?"} / ${f.trade_b_symbol ?? "?"}) — flagged ${new Date(f.created_at).toLocaleString()}.`,
    });
  }

  // Account mismatch — assigned account with no valid linked active challenge
  const assignedQuery = await serviceClient.from("trading_accounts").select("id, login").eq("status", "assigned");
  const assignedAccounts = ((assignedQuery.data ?? []) as unknown as any[]);
  if (assignedAccounts.length > 0) {
    const linkedQuery = await serviceClient.from("user_challenges").select("trading_account_id").eq("status", "active").in("trading_account_id", assignedAccounts.map((a) => a.id));
    const linkedIds = new Set(((linkedQuery.data ?? []) as unknown as any[]).map((c) => c.trading_account_id));
    for (const a of assignedAccounts) {
      if (!linkedIds.has(a.id)) {
        cases.push({
          sourceType: "account_mismatch", sourceId: a.id, userId: null, category: CATEGORY_MAP.account_mismatch,
          priority: "critical", reason: "Account marked assigned with no active challenge",
          description: `Trading account ${a.login} shows status 'assigned' but has no linked active challenge — a real data inconsistency worth investigating.`,
        });
      }
    }
  }

  return cases;
}

export async function syncManualReviews(): Promise<void> {
  const serviceClient = createServiceClient();
  const detected = await detectCases(serviceClient);

  for (const c of detected) {
    const existingQuery = await serviceClient
      .from("manual_reviews")
      .select("id, status")
      .eq("source_type", c.sourceType)
      .eq("source_id", c.sourceId)
      .maybeSingle();
    const existing = existingQuery.data as { id: string; status: string } | null;

    if (!existing) {
      const { data: inserted } = await (serviceClient.from("manual_reviews") as any)
        .insert({
          source_type: c.sourceType, source_id: c.sourceId, user_id: c.userId,
          category: c.category, priority: c.priority, status: "open",
          reason: c.reason, description: c.description,
        })
        .select("id")
        .single();
      if (inserted) {
        await (serviceClient.from("manual_review_events") as any).insert({
          review_id: inserted.id, event_type: "Review Created", note: "Auto-detected by system",
        });
      }
    }
  }

  // Auto-resolve reviews whose underlying condition has cleared
  const openReviewsQuery = await serviceClient.from("manual_reviews").select("id, source_type, source_id, status").in("status", ["open", "assigned", "waiting_customer"]);
  const openReviews = ((openReviewsQuery.data ?? []) as unknown as any[]);
  const stillDetectedKeys = new Set(detected.map((c) => `${c.sourceType}:${c.sourceId}`));

  for (const r of openReviews) {
    const key = `${r.source_type}:${r.source_id}`;
    if (!stillDetectedKeys.has(key)) {
      await (serviceClient.from("manual_reviews") as any).update({ status: "resolved", resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", r.id);
      await (serviceClient.from("manual_review_events") as any).insert({ review_id: r.id, event_type: "Auto-Resolved", note: "Underlying condition cleared automatically" });
    }
  }
}

export interface ReviewStats {
  openReviews: number;
  highPriority: number;
  assigned: number;
  completedToday: number;
  avgResolutionHours: number;
  escalated: number;
}

export async function getReviewStats(): Promise<ReviewStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const allQuery = await serviceClient.from("manual_reviews").select("status, priority, created_at, resolved_at");
  const all = ((allQuery.data ?? []) as unknown as any[]);

  const resolved = all.filter((r) => r.resolved_at);
  const totalHours = resolved.reduce((s, r) => s + (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60), 0);

  return {
    openReviews: all.filter((r) => ["open", "assigned", "waiting_customer"].includes(r.status)).length,
    highPriority: all.filter((r) => (r.priority === "high" || r.priority === "critical") && ["open", "assigned", "waiting_customer"].includes(r.status)).length,
    assigned: all.filter((r) => r.status === "assigned").length,
    completedToday: resolved.filter((r) => r.resolved_at >= todayStart).length,
    avgResolutionHours: resolved.length > 0 ? Math.round((totalHours / resolved.length) * 10) / 10 : 0,
    escalated: all.filter((r) => r.status === "escalated").length,
  };
}

export interface ReviewRow {
  id: string;
  ticketNumber: number;
  createdAt: string;
  traderName: string | null;
  email: string | null;
  category: string;
  priority: string;
  assignedAdminName: string | null;
  status: string;
  updatedAt: string;
}

export async function getReviewsPage(params: { search?: string; filter?: string; priority?: string; category?: string; page: number; pageSize: number }) {
  const serviceClient = createServiceClient();
  const { search, filter = "all", priority, category, page, pageSize } = params;

  let query = serviceClient.from("manual_reviews").select("*");

  if (filter === "open") query = query.eq("status", "open");
  else if (filter === "assigned") query = query.eq("status", "assigned");
  else if (filter === "waiting_customer") query = query.eq("status", "waiting_customer");
  else if (filter === "completed") query = query.in("status", ["resolved", "rejected"]);
  else if (filter === "escalated") query = query.eq("status", "escalated");
  else if (filter === "high_priority") query = query.in("priority", ["high", "critical"]);

  if (priority) query = query.eq("priority", priority);
  if (category) query = query.eq("category", category);

  const allQuery = await query.order("created_at", { ascending: false });
  let rows = ((allQuery.data ?? []) as unknown as any[]);

  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const adminIds = [...new Set(rows.map((r) => r.assigned_admin_id).filter(Boolean))];
  const allIds = [...new Set([...userIds, ...adminIds])];
  const usersQuery = allIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", allIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    rows = rows.filter((r) => {
      const user = r.user_id ? userById.get(r.user_id) : null;
      return (
        String(r.ticket_number).includes(term) ||
        r.id.includes(term) ||
        (user?.email ?? "").toLowerCase().includes(term) ||
        (user?.full_name ?? "").toLowerCase().includes(term)
      );
    });
  }

  const totalCount = rows.length;
  const pageItems = rows.slice((page - 1) * pageSize, page * pageSize);

  const result: ReviewRow[] = pageItems.map((r) => {
    const user = r.user_id ? userById.get(r.user_id) : null;
    const admin = r.assigned_admin_id ? userById.get(r.assigned_admin_id) : null;
    return {
      id: r.id,
      ticketNumber: r.ticket_number,
      createdAt: r.created_at,
      traderName: user?.full_name ?? user?.email ?? null,
      email: user?.email ?? null,
      category: r.category,
      priority: r.priority,
      assignedAdminName: admin?.full_name ?? admin?.email ?? null,
      status: r.status,
      updatedAt: r.updated_at,
    };
  });

  return { reviews: result, totalCount };
}

export interface ReviewDetail {
  ticketNumber: number;
  customer: { name: string | null; email: string | null; username: string | null; country: string | null; phone: string | null } | null;
  challenge: { challengeId: string; accountSize: number | null; phase: number; status: string; purchaseDate: string | null } | null;
  tradingAccount: { mt5Login: string | null; server: string | null; balance: number | null; equity: number | null; status: string } | null;
  reviewDetails: { category: string; reason: string; description: string; sourceType: string; createdBy: string; createdAt: string };
  assignedAdminName: string | null;
  assignedAdminId: string | null;
  status: string;
  priority: string;
  resolutionNotes: string | null;
  timeline: { eventType: string; adminName: string | null; note: string | null; timestamp: string }[];
  notes: { authorName: string; note: string; timestamp: string }[];
  sourceType: string;
  sourceId: string;
}

export async function getReviewDetail(reviewId: string): Promise<ReviewDetail | null> {
  const serviceClient = createServiceClient();

  const reviewQuery = await serviceClient.from("manual_reviews").select("*").eq("id", reviewId).single();
  const review = reviewQuery.data as any;
  if (reviewQuery.error || !review) return null;

  let customer: ReviewDetail["customer"] = null;
  if (review.user_id) {
    const userQuery = await serviceClient.from("users").select("full_name, email, username, country, phone").eq("id", review.user_id).single();
    const u = userQuery.data as any;
    if (u) customer = { name: u.full_name, email: u.email, username: u.username, country: u.country, phone: u.phone };
  }

  let challenge: ReviewDetail["challenge"] = null;
  let tradingAccount: ReviewDetail["tradingAccount"] = null;

  if (["payment", "provisioning", "vps"].includes(review.source_type) && review.user_id) {
    const challengeQuery = review.source_type === "payment"
      ? await serviceClient.from("user_challenges").select("*").eq("user_id", review.user_id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      : await serviceClient.from("user_challenges").select("*").eq("id", review.source_id).maybeSingle();
    const c = challengeQuery.data as any;
    if (c) {
      const accountQuery = c.trading_account_id ? await serviceClient.from("trading_accounts").select("account_size, server, status").eq("id", c.trading_account_id).single() : { data: null };
      const account = accountQuery.data as any;
      challenge = { challengeId: c.id, accountSize: account?.account_size ?? null, phase: c.current_phase, status: c.status, purchaseDate: c.created_at };
      tradingAccount = { mt5Login: c.account_login, server: account?.server ?? null, balance: c.last_known_balance, equity: c.last_known_equity, status: account?.status ?? "unknown" };
    }
  }

  if (review.source_type === "account_mismatch") {
    const accountQuery = await serviceClient.from("trading_accounts").select("login, server, status, account_size").eq("id", review.source_id).single();
    const a = accountQuery.data as any;
    if (a) tradingAccount = { mt5Login: a.login, server: a.server, balance: null, equity: null, status: a.status };
  }

  let assignedAdminName: string | null = null;
  if (review.assigned_admin_id) {
    const adminQuery = await serviceClient.from("users").select("full_name, email").eq("id", review.assigned_admin_id).single();
    const admin = adminQuery.data as any;
    assignedAdminName = admin?.full_name ?? admin?.email ?? null;
  }

  const timelineQuery = await serviceClient.from("manual_review_events").select("event_type, admin_id, note, created_at").eq("review_id", reviewId).order("created_at", { ascending: true });
  const timelineRows = ((timelineQuery.data ?? []) as unknown as any[]);
  const timelineAdminIds = [...new Set(timelineRows.map((t) => t.admin_id).filter(Boolean))];
  const timelineAdminsQuery = timelineAdminIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", timelineAdminIds) : { data: [] as any[] };
  const timelineAdminById = new Map(((timelineAdminsQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  const notesQuery = await serviceClient.from("manual_review_notes").select("admin_id, note, created_at").eq("review_id", reviewId).order("created_at", { ascending: false });
  const noteRows = ((notesQuery.data ?? []) as unknown as any[]);
  const noteAdminIds = [...new Set(noteRows.map((n) => n.admin_id))];
  const noteAdminsQuery = noteAdminIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", noteAdminIds) : { data: [] as any[] };
  const noteAdminById = new Map(((noteAdminsQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  return {
    ticketNumber: review.ticket_number,
    customer,
    challenge,
    tradingAccount,
    reviewDetails: { category: review.category, reason: review.reason, description: review.description ?? "", sourceType: review.source_type, createdBy: "System (Auto-Detected)", createdAt: review.created_at },
    assignedAdminName,
    assignedAdminId: review.assigned_admin_id,
    status: review.status,
    priority: review.priority,
    resolutionNotes: review.resolution_notes,
    timeline: timelineRows.map((t) => ({ eventType: t.event_type, adminName: t.admin_id ? (timelineAdminById.get(t.admin_id)?.full_name ?? timelineAdminById.get(t.admin_id)?.email ?? null) : null, note: t.note, timestamp: t.created_at })),
    notes: noteRows.map((n) => ({ authorName: noteAdminById.get(n.admin_id)?.full_name ?? noteAdminById.get(n.admin_id)?.email ?? "Admin", note: n.note, timestamp: n.created_at })),
    sourceType: review.source_type,
    sourceId: review.source_id,
  };
}

export interface ReviewChartsData {
  byCategory: { category: string; count: number }[];
  last30Days: { date: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
}

export async function getReviewCharts(): Promise<ReviewChartsData> {
  const serviceClient = createServiceClient();

  const openQuery = await serviceClient.from("manual_reviews").select("category").in("status", ["open", "assigned", "waiting_customer"]);
  const categoryCounts = new Map<string, number>();
  for (const r of ((openQuery.data ?? []) as unknown as { category: string }[])) {
    categoryCounts.set(r.category, (categoryCounts.get(r.category) ?? 0) + 1);
  }

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const recentQuery = await serviceClient.from("manual_reviews").select("created_at").gte("created_at", since30);
  const dayCounts = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dayCounts.set(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10), 0);
  }
  for (const r of ((recentQuery.data ?? []) as unknown as { created_at: string }[])) {
    const key = new Date(Date.UTC(new Date(r.created_at).getUTCFullYear(), new Date(r.created_at).getUTCMonth(), new Date(r.created_at).getUTCDate())).toISOString().slice(0, 10);
    if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const priorityQuery = await serviceClient.from("manual_reviews").select("priority").in("status", ["open", "assigned", "waiting_customer"]);
  const priorityCounts = new Map<string, number>();
  for (const r of ((priorityQuery.data ?? []) as unknown as { priority: string }[])) {
    priorityCounts.set(r.priority, (priorityCounts.get(r.priority) ?? 0) + 1);
  }

  return {
    byCategory: [...categoryCounts.entries()].map(([category, count]) => ({ category, count })),
    last30Days: [...dayCounts.entries()].map(([date, count]) => ({ date, count })),
    priorityDistribution: [...priorityCounts.entries()].map(([priority, count]) => ({ priority, count })),
  };
}
