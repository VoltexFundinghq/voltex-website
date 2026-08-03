import { createServiceClient } from "@/lib/supabase/service";

export interface PurchaseStats {
  todaysPurchases: number;
  todaysRevenue: number;
  pending: number;
  successful: number;
  failed: number;
  refunded: number;
}

export type ProvisionStatus = "waiting" | "queued" | "provisioning" | "completed" | "error" | "cancelled";

export interface PurchaseRow {
  id: string;
  created_at: string;
  email: string;
  full_name: string | null;
  challenge_size: string;
  price_paid: number;
  payment_status: string;
  payment_reference: string | null;
  provisionStatus: ProvisionStatus;
  needsAttention: boolean;
}

export interface PurchaseListResult {
  purchases: PurchaseRow[];
  totalCount: number;
}

export interface TimelineStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  failed?: boolean;
}

export interface ConsentRecord {
  onFile: boolean;
  agreedAt: string | null;
  ipAddress: string | null;
  deviceSummary: string | null;
}

export interface PurchaseDetail {
  id: string;
  customer: { name: string | null; email: string; username: string | null; country: string | null };
  purchase: { challenge_size: string; price_paid: number; created_at: string };
  payment: { gateway: string; reference: string | null; status: string };
  provision: {
    status: ProvisionStatus;
    mt5Login: string | null;
    server: string | null;
    vpsSlot: string | null;
    credentialsSent: boolean;
  };
  consent: ConsentRecord;
  orderAgeMinutes: number;
  cancelled: boolean;
  timeline: TimelineStep[];
  matchedChallengeId: string | null;
  userId: string;
}

function deriveProvisionStatus(purchase: { payment_status: string }, matchedChallenge: any | null): { status: ProvisionStatus; needsAttention: boolean } {
  if (purchase.payment_status === "failed") {
    return { status: "cancelled", needsAttention: true };
  }
  if (purchase.payment_status !== "completed") {
    return { status: "waiting", needsAttention: false };
  }
  if (!matchedChallenge) {
    return { status: "error", needsAttention: true };
  }
  if (matchedChallenge.status === "awaiting_allocation") {
    return { status: "queued", needsAttention: false };
  }
  if (matchedChallenge.status === "active" && matchedChallenge.account_login) {
    return { status: "completed", needsAttention: false };
  }
  return { status: "provisioning", needsAttention: false };
}

function currentStageLabel(status: string, phase: number): string {
  if (status === "active" && phase === 3) return "Funded";
  if (status === "active") return `Phase ${phase}`;
  if (status === "passed") return "Passed";
  if (status === "failed") return "Failed";
  return status;
}

function matchChallenge(purchase: { user_id: string; created_at: string }, challenges: any[]): any | null {
  const candidates = challenges.filter((c) => c.user_id === purchase.user_id);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => {
    const diffA = Math.abs(new Date(a.created_at).getTime() - new Date(purchase.created_at).getTime());
    const diffB = Math.abs(new Date(b.created_at).getTime() - new Date(purchase.created_at).getTime());
    return diffA - diffB;
  })[0];
}

export async function getPurchaseStats(): Promise<PurchaseStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const [todayQuery, pendingQuery, successQuery, failedQuery, refundedQuery] = await Promise.all([
    serviceClient.from("challenge_purchases").select("price_paid, payment_status").gte("created_at", todayStart),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "completed"),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "failed"),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "refunded"),
  ]);

  const todayRows = (todayQuery.data as { price_paid: number; payment_status: string }[]) ?? [];

  return {
    todaysPurchases: todayRows.length,
    todaysRevenue: todayRows.filter((r) => r.payment_status === "completed").reduce((s, r) => s + Number(r.price_paid), 0),
    pending: pendingQuery.count ?? 0,
    successful: successQuery.count ?? 0,
    failed: failedQuery.count ?? 0,
    refunded: refundedQuery.count ?? 0,
  };
}

export async function getPurchasesPage(params: {
  search?: string;
  filter?: string;
  page: number;
  pageSize: number;
}): Promise<PurchaseListResult> {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const term = search.trim();
    const usersQuery = await serviceClient
      .from("users")
      .select("id")
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,username.ilike.%${term}%`);
    matchingUserIds = (usersQuery.data as { id: string }[] ?? []).map((u) => u.id);
  }

  let query = serviceClient.from("challenge_purchases").select("*", { count: "exact" });

  if (search && search.trim()) {
    const term = search.trim();
    const orParts = [`payment_reference.ilike.%${term}%`, `challenge_size.ilike.%${term}%`];
    if (matchingUserIds && matchingUserIds.length > 0) {
      orParts.push(`user_id.in.(${matchingUserIds.join(",")})`);
    }
    query = query.or(orParts.join(","));
  }

  if (["pending", "completed", "failed", "refunded"].includes(filter)) {
    query = query.eq("payment_status", filter === "completed" ? "completed" : filter);
  }

  query = query.order("created_at", { ascending: false });

  const allMatchingQuery = await query;
  const allMatching = (allMatchingQuery.data as any[]) ?? [];

  const userIds = [...new Set(allMatching.map((p) => p.user_id))];
  const usersQuery = userIds.length > 0
    ? await serviceClient.from("users").select("id, email, full_name").in("id", userIds)
    : { data: [] as any[] };
  const usersById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u]));

  const challengesQuery = userIds.length > 0
    ? await serviceClient.from("user_challenges").select("user_id, status, current_phase, account_login, created_at").in("user_id", userIds)
    : { data: [] as any[] };
  const allChallenges = (challengesQuery.data as any[]) ?? [];

  let enriched: PurchaseRow[] = allMatching.map((p) => {
    const user = usersById.get(p.user_id);
    const matched = matchChallenge(p, allChallenges);
    const { status: provisionStatus, needsAttention } = deriveProvisionStatus(p, matched);
    return {
      id: p.id,
      created_at: p.created_at,
      email: user?.email ?? "unknown",
      full_name: user?.full_name ?? null,
      challenge_size: p.challenge_size,
      price_paid: Number(p.price_paid),
      payment_status: p.payment_status,
      payment_reference: p.payment_reference,
      provisionStatus,
      needsAttention,
    };
  });

  if (["queued", "provisioning", "completed_provision"].includes(filter)) {
    const target = filter === "completed_provision" ? "completed" : filter;
    enriched = enriched.filter((p) => p.provisionStatus === target);
  }

  const totalCount = enriched.length;
  const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);

  return { purchases: pageItems, totalCount };
}

export async function getPurchaseDetail(purchaseId: string): Promise<PurchaseDetail | null> {
  const serviceClient = createServiceClient();

  const purchaseQuery = await serviceClient.from("challenge_purchases").select("*").eq("id", purchaseId).single();
  const purchase = purchaseQuery.data as any;
  if (purchaseQuery.error || !purchase) return null;

  const userQuery = await serviceClient.from("users").select("id, email, full_name, username, country").eq("id", purchase.user_id).single();
  const user = userQuery.data as any;

  const challengesQuery = await serviceClient
    .from("user_challenges")
    .select("id, status, current_phase, trading_account_id, account_login, created_at")
    .eq("user_id", purchase.user_id);
  const challenges = (challengesQuery.data as any[]) ?? [];
  const matched = matchChallenge(purchase, challenges);

  let mt5Login: string | null = null;
  let server: string | null = null;
  let accountAssignedAt: string | null = null;
  let vpsSlot: string | null = null;

  if (matched?.trading_account_id) {
    const accountQuery = await serviceClient.from("trading_accounts").select("login, server, assigned_at").eq("id", matched.trading_account_id).single();
    const account = accountQuery.data as any;
    if (account) {
      mt5Login = account.login;
      server = account.server;
      accountAssignedAt = account.assigned_at;
    }

    const slotQuery = await serviceClient.from("vps_slots").select("slot_label").eq("current_user_challenge_id", matched.id).maybeSingle();
    vpsSlot = (slotQuery.data as { slot_label: string } | null)?.slot_label ?? null;
  }

  // Real consent record, matched by the shared orderId — both
  // payment_reference and purchase_reference are set to the same
  // value at checkout time.
  let consent: ConsentRecord = { onFile: false, agreedAt: null, ipAddress: null, deviceSummary: null };
  if (purchase.payment_reference) {
    const consentQuery = await serviceClient
      .from("terms_acceptances")
      .select("agreed_at, ip_address, device_summary")
      .eq("purchase_reference", purchase.payment_reference)
      .maybeSingle();
    const consentRow = consentQuery.data as { agreed_at: string; ip_address: string | null; device_summary: string | null } | null;
    if (consentRow) {
      consent = { onFile: true, agreedAt: consentRow.agreed_at, ipAddress: consentRow.ip_address, deviceSummary: consentRow.device_summary };
    }
  }

  const { status: provisionStatus } = deriveProvisionStatus(purchase, matched);
  const credentialsSent = !!mt5Login;
  const orderAgeMinutes = Math.round((Date.now() - new Date(purchase.created_at).getTime()) / 60000);
  const cancelled = purchase.payment_status === "failed";

  const timeline: TimelineStep[] = [
    { label: "Purchase Created", timestamp: purchase.created_at, reached: true },
  ];

  if (cancelled) {
    timeline.push({ label: "Payment Failed", timestamp: purchase.updated_at ?? purchase.created_at, reached: true, failed: true });
  } else {
    timeline.push({ label: "Payment Verified", timestamp: purchase.payment_confirmed_at, reached: purchase.payment_status === "completed" });
    timeline.push({ label: "Challenge Record Created", timestamp: matched?.created_at ?? null, reached: !!matched });
    timeline.push({ label: "Inventory Reserved", timestamp: accountAssignedAt, reached: !!mt5Login });
    timeline.push({ label: "Account Assigned", timestamp: accountAssignedAt, reached: !!mt5Login });
    timeline.push({ label: "Credentials Delivered", timestamp: accountAssignedAt, reached: credentialsSent });
  }

  return {
    id: purchase.id,
    customer: { name: user?.full_name ?? null, email: user?.email ?? "unknown", username: user?.username ?? null, country: user?.country ?? null },
    purchase: { challenge_size: purchase.challenge_size, price_paid: Number(purchase.price_paid), created_at: purchase.created_at },
    payment: { gateway: "PalmPay", reference: purchase.payment_reference, status: purchase.payment_status },
    provision: {
      status: provisionStatus,
      mt5Login,
      server,
      vpsSlot,
      credentialsSent,
    },
    consent,
    orderAgeMinutes,
    cancelled,
    timeline,
    matchedChallengeId: matched?.id ?? null,
    userId: purchase.user_id,
  };
}

export async function getPurchaseRevenueLast30Days(): Promise<{ date: string; revenue: number }[]> {
  const serviceClient = createServiceClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const query = await serviceClient
    .from("challenge_purchases")
    .select("price_paid, created_at")
    .eq("payment_status", "completed")
    .gte("created_at", since);

  const rows = (query.data as { price_paid: number; created_at: string }[]) ?? [];
  const byDay = new Map<string, number>();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
    byDay.set(key, 0);
  }

  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Number(row.price_paid));
  }

  return [...byDay.entries()].map(([date, revenue]) => ({ date, revenue }));
}

export interface PurchaseActivityEvent {
  text: string;
  timestamp: string;
}

export async function getRecentPurchaseActivity(limit = 15): Promise<PurchaseActivityEvent[]> {
  const serviceClient = createServiceClient();

  const purchasesQuery = await serviceClient
    .from("challenge_purchases")
    .select("user_id, challenge_size, price_paid, payment_status, payment_confirmed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const purchases = (purchasesQuery.data as any[]) ?? [];
  const userIds = [...new Set(purchases.map((p) => p.user_id))];
  const usersQuery = userIds.length > 0
    ? await serviceClient.from("users").select("id, full_name, email").in("id", userIds)
    : { data: [] as any[] };
  const usersById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u]));

  const challengesQuery = userIds.length > 0
    ? await serviceClient.from("user_challenges").select("user_id, trading_account_id, created_at").in("user_id", userIds)
    : { data: [] as any[] };
  const allChallenges = (challengesQuery.data as any[]) ?? [];

  const events: PurchaseActivityEvent[] = [];
  for (const p of purchases) {
    const user = usersById.get(p.user_id);
    const name = user?.full_name ?? user?.email ?? "A trader";
    events.push({ text: `${name} purchased ₦${Number(p.price_paid).toLocaleString()} Challenge`, timestamp: p.created_at });
    if (p.payment_status === "completed" && p.payment_confirmed_at) {
      events.push({ text: `Payment confirmed for ${name}`, timestamp: p.payment_confirmed_at });
    }
    const matched = matchChallenge(p, allChallenges);
    if (matched?.trading_account_id) {
      events.push({ text: `Account provisioned for ${name}`, timestamp: matched.created_at });
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}
