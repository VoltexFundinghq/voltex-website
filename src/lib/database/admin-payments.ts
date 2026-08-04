import { createServiceClient } from "@/lib/supabase/service";

export interface PaymentStats {
  totalToday: number;
  todaysRevenue: number;
  pending: number;
  successful: number;
  failed: number;
  refunded: number;
}

export interface GatewayBreakdown {
  gateway: string;
  count: number;
  revenue: number;
  successRatePercent: number;
}

export interface PaymentRow {
  id: string;
  createdAt: string;
  traderName: string | null;
  email: string;
  challengeSize: string;
  amount: number;
  status: string;
  reference: string | null;
}

export interface PaymentAnalytics {
  averageOrderValue: number;
  mostPurchasedChallenge: string;
  conversionRatePercent: number;
  failedPaymentPercent: number;
}

export interface PaymentDetail {
  id: string;
  customer: { name: string | null; email: string; username: string | null; country: string | null };
  challenge: { size: string; amount: number };
  metadata: { reference: string | null; ipAddress: string | null; deviceSummary: string | null; country: string | null };
  timeline: { label: string; timestamp: string | null; reached: boolean }[];
  status: string;
}

export async function getPaymentStats(): Promise<PaymentStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const [todayQuery, pendingQuery, successQuery, failedQuery, refundedQuery] = await Promise.all([
    serviceClient.from("challenge_purchases").select("price_paid, payment_status").gte("created_at", todayStart),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "completed"),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "failed"),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "refunded"),
  ]);

  const todayRows = ((todayQuery.data ?? []) as unknown as { price_paid: number; payment_status: string }[]);

  return {
    totalToday: todayRows.length,
    todaysRevenue: todayRows.filter((r) => r.payment_status === "completed").reduce((s, r) => s + Number(r.price_paid), 0),
    pending: pendingQuery.count ?? 0,
    successful: successQuery.count ?? 0,
    failed: failedQuery.count ?? 0,
    refunded: refundedQuery.count ?? 0,
  };
}

export async function getRevenueChart(granularity: "daily" | "weekly" | "monthly"): Promise<{ label: string; revenue: number }[]> {
  const serviceClient = createServiceClient();

  if (granularity === "daily") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const query = await serviceClient.from("challenge_purchases").select("price_paid, created_at").eq("payment_status", "completed").gte("created_at", since);
    const rows = ((query.data ?? []) as unknown as { price_paid: number; created_at: string }[]);
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      byDay.set(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10), 0);
    }
    for (const r of rows) {
      const key = new Date(Date.UTC(new Date(r.created_at).getUTCFullYear(), new Date(r.created_at).getUTCMonth(), new Date(r.created_at).getUTCDate())).toISOString().slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Number(r.price_paid));
    }
    return [...byDay.entries()].map(([label, revenue]) => ({ label, revenue }));
  }

  if (granularity === "weekly") {
    const since = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();
    const query = await serviceClient.from("challenge_purchases").select("price_paid, created_at").eq("payment_status", "completed").gte("created_at", since);
    const rows = ((query.data ?? []) as unknown as { price_paid: number; created_at: string }[]);
    const byWeek = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const key = `Week of ${new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      byWeek.set(key, 0);
    }
    const weekKeys = [...byWeek.keys()];
    for (const r of rows) {
      const weeksAgo = Math.floor((Date.now() - new Date(r.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000));
      const idx = 11 - weeksAgo;
      if (idx >= 0 && idx < weekKeys.length) byWeek.set(weekKeys[idx], (byWeek.get(weekKeys[idx]) ?? 0) + Number(r.price_paid));
    }
    return [...byWeek.entries()].map(([label, revenue]) => ({ label, revenue }));
  }

  // monthly
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 11);
  const query = await serviceClient.from("challenge_purchases").select("price_paid, created_at").eq("payment_status", "completed").gte("created_at", since.toISOString());
  const rows = ((query.data ?? []) as unknown as { price_paid: number; created_at: string }[]);
  const byMonth = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, 0);
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + Number(r.price_paid));
  }
  return [...byMonth.entries()].map(([label, revenue]) => ({ label, revenue }));
}

export async function getGatewayBreakdown(): Promise<GatewayBreakdown[]> {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("challenge_purchases").select("price_paid, payment_status");
  const rows = ((query.data ?? []) as unknown as { price_paid: number; payment_status: string }[]);

  const completed = rows.filter((r) => r.payment_status === "completed");
  const total = rows.length;

  // Genuinely only one gateway exists — PalmPay. Not a fabricated
  // multi-row breakdown.
  return [{
    gateway: "PalmPay",
    count: total,
    revenue: completed.reduce((s, r) => s + Number(r.price_paid), 0),
    successRatePercent: total > 0 ? Math.round((completed.length / total) * 100) : 0,
  }];
}

export async function getPaymentsPage(params: { search?: string; filter?: string; page: number; pageSize: number }) {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let matchingUserIds: string[] | null = null;
  if (search && search.trim()) {
    const term = search.trim();
    const usersQuery = await serviceClient.from("users").select("id").or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
    matchingUserIds = ((usersQuery.data ?? []) as unknown as { id: string }[]).map((u) => u.id);
  }

  let query = serviceClient.from("challenge_purchases").select("*", { count: "exact" });

  if (search && search.trim()) {
    const term = search.trim();
    const orParts = [`payment_reference.ilike.%${term}%`, `id.eq.${term}`];
    if (matchingUserIds && matchingUserIds.length > 0) orParts.push(`user_id.in.(${matchingUserIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();

  if (["pending", "completed", "failed", "refunded"].includes(filter)) query = query.eq("payment_status", filter);
  else if (filter === "today") query = query.gte("created_at", todayStart);
  else if (filter === "week") query = query.gte("created_at", weekStart);
  else if (filter === "month") query = query.gte("created_at", monthStart);

  query = query.order("created_at", { ascending: false });
  const allQuery = await query;
  const rows = ((allQuery.data ?? []) as unknown as any[]);
  const totalCount = allQuery.count ?? rows.length;

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email, full_name").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  const pageItems = rows.slice((page - 1) * pageSize, page * pageSize);
  const payments: PaymentRow[] = pageItems.map((r) => {
    const user = userById.get(r.user_id);
    return {
      id: r.id,
      createdAt: r.created_at,
      traderName: user?.full_name ?? null,
      email: user?.email ?? "unknown",
      challengeSize: r.challenge_size,
      amount: Number(r.price_paid),
      status: r.payment_status,
      reference: r.payment_reference,
    };
  });

  return { payments, totalCount };
}

export async function getPaymentAnalytics(): Promise<PaymentAnalytics> {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("challenge_purchases").select("price_paid, payment_status, challenge_size");
  const rows = ((query.data ?? []) as unknown as { price_paid: number; payment_status: string; challenge_size: string }[]);

  const completed = rows.filter((r) => r.payment_status === "completed");
  const failed = rows.filter((r) => r.payment_status === "failed");
  const total = rows.length;

  const sizeCounts = new Map<string, number>();
  for (const r of completed) sizeCounts.set(r.challenge_size, (sizeCounts.get(r.challenge_size) ?? 0) + 1);
  const mostPurchased = [...sizeCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    averageOrderValue: completed.length > 0 ? Math.round(completed.reduce((s, r) => s + Number(r.price_paid), 0) / completed.length) : 0,
    mostPurchasedChallenge: mostPurchased?.[0] ?? "—",
    conversionRatePercent: total > 0 ? Math.round((completed.length / total) * 100) : 0,
    failedPaymentPercent: total > 0 ? Math.round((failed.length / total) * 100) : 0,
  };
}

export async function getPaymentDetail(purchaseId: string): Promise<PaymentDetail | null> {
  const serviceClient = createServiceClient();

  const purchaseQuery = await serviceClient.from("challenge_purchases").select("*").eq("id", purchaseId).single();
  const purchase = purchaseQuery.data as any;
  if (purchaseQuery.error || !purchase) return null;

  const userQuery = await serviceClient.from("users").select("full_name, email, username, country").eq("id", purchase.user_id).single();
  const user = userQuery.data as any;

  let ipAddress: string | null = null;
  let deviceSummary: string | null = null;
  if (purchase.payment_reference) {
    const consentQuery = await serviceClient.from("terms_acceptances").select("ip_address, device_summary").eq("purchase_reference", purchase.payment_reference).maybeSingle();
    const consent = consentQuery.data as { ip_address: string | null; device_summary: string | null } | null;
    if (consent) {
      ipAddress = consent.ip_address;
      deviceSummary = consent.device_summary;
    }
  }

  const challengesQuery = await serviceClient.from("user_challenges").select("id, trading_account_id, created_at").eq("user_id", purchase.user_id);
  const challenges = ((challengesQuery.data ?? []) as unknown as any[]);
  const matched = challenges
    .map((c) => ({ c, diff: Math.abs(new Date(c.created_at).getTime() - new Date(purchase.created_at).getTime()) }))
    .sort((a, b) => a.diff - b.diff)[0]?.c ?? null;

  let credentialsSentAt: string | null = null;
  if (matched?.trading_account_id) {
    const accountQuery = await serviceClient.from("trading_accounts").select("assigned_at").eq("id", matched.trading_account_id).single();
    credentialsSentAt = (accountQuery.data as { assigned_at: string } | null)?.assigned_at ?? null;
  }

  const timeline = [
    { label: "Purchase Created", timestamp: purchase.created_at, reached: true },
    { label: "Payment Verified", timestamp: purchase.payment_confirmed_at, reached: purchase.payment_status === "completed" },
    { label: "Challenge Provisioned", timestamp: credentialsSentAt, reached: !!credentialsSentAt },
    { label: "Email Sent", timestamp: credentialsSentAt, reached: !!credentialsSentAt },
  ];

  return {
    id: purchase.id,
    customer: { name: user?.full_name ?? null, email: user?.email ?? "unknown", username: user?.username ?? null, country: user?.country ?? null },
    challenge: { size: purchase.challenge_size, amount: Number(purchase.price_paid) },
    metadata: { reference: purchase.payment_reference, ipAddress, deviceSummary, country: user?.country ?? null },
    timeline,
    status: purchase.payment_status,
  };
}

export async function getAllPaymentsForExport() {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("challenge_purchases").select("*").order("created_at", { ascending: false });
  const rows = ((query.data ?? []) as unknown as any[]);

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email, full_name").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  return rows.map((r) => {
    const user = userById.get(r.user_id);
    return {
      Date: new Date(r.created_at).toISOString(),
      Trader: user?.full_name ?? "",
      Email: user?.email ?? "",
      Challenge: r.challenge_size,
      Amount: Number(r.price_paid),
      Gateway: "PalmPay",
      Status: r.payment_status,
      Reference: r.payment_reference ?? "",
    };
  });
}
