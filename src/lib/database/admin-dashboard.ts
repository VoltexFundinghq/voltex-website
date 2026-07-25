import { createServiceClient } from "@/lib/supabase/service";

export interface DashboardKPIs {
  activeTraders: number;
  revenueToday: number;
  revenueThisMonth: number;
  pendingPayments: number;
  pendingProvisioning: number;
  availableInventory: number;
  passedChallenges: number;
  fundedTraders: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export interface RecentPurchase {
  id: string;
  email: string;
  challenge_size: string;
  price_paid: number;
  payment_status: string;
  created_at: string;
}

export interface RecentResult {
  id: string;
  email: string;
  outcome: "passed" | "failed" | "funded";
  account_size: number | null;
  created_at: string;
}

export interface InventoryHealthRow {
  size: number;
  available: number;
  reserved: number;
  assigned: number;
  resetting: number;
  expired: number;
  total: number;
  healthLevel: "healthy" | "low" | "critical";
}

export interface SmartLoopStatus {
  waitingProvisioning: number;
  lowInventorySizes: number[];
  activeVpsSlots: number;
  healthyVpsSlots: number;
}

export interface SystemHealthItem {
  name: string;
  status: "healthy" | "warning" | "offline" | "unmonitored";
  detail: string;
}

export interface ActivityItem {
  type: "User Registered" | "Challenge Purchased" | "Payment Confirmed" | "Account Assigned" | "Challenge Passed" | "Challenge Failed" | "Challenge Funded" | "Payout Requested";
  description: string;
  timestamp: string;
}

const LOW_INVENTORY_THRESHOLD = 3;

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function startOfUTCMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const serviceClient = createServiceClient();
  const now = new Date();
  const todayStart = startOfUTCDay(now).toISOString();
  const monthStart = startOfUTCMonth(now).toISOString();

  const [active, revenueToday, revenueMonth, pendingPayments, pending, available, passed, fundedQuery] = await Promise.all([
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "active"),
    serviceClient.from("challenge_purchases").select("price_paid").eq("payment_status", "completed").gte("created_at", todayStart),
    serviceClient.from("challenge_purchases").select("price_paid").eq("payment_status", "completed").gte("created_at", monthStart),
    serviceClient.from("challenge_purchases").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "awaiting_allocation"),
    serviceClient.from("trading_accounts").select("id", { count: "exact", head: true }).eq("status", "available"),
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "passed"),
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "active").eq("current_phase", 3),
  ]);

  const sumPrices = (rows: { price_paid: number }[] | null) => (rows ?? []).reduce((sum, r) => sum + Number(r.price_paid), 0);

  return {
    activeTraders: active.count ?? 0,
    revenueToday: sumPrices(revenueToday.data as any),
    revenueThisMonth: sumPrices(revenueMonth.data as any),
    pendingPayments: pendingPayments.count ?? 0,
    pendingProvisioning: pending.count ?? 0,
    availableInventory: available.count ?? 0,
    passedChallenges: passed.count ?? 0,
    fundedTraders: fundedQuery.count ?? 0,
  };
}

export async function getRevenueLast30Days(): Promise<RevenuePoint[]> {
  const serviceClient = createServiceClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const query = await serviceClient
    .from("challenge_purchases")
    .select("price_paid, created_at")
    .eq("payment_status", "completed")
    .gte("created_at", since);

  const rows = query.data as { price_paid: number; created_at: string }[] | null;
  const byDay = new Map<string, number>();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = startOfUTCDay(d).toISOString().slice(0, 10);
    byDay.set(key, 0);
  }

  for (const row of rows ?? []) {
    const key = startOfUTCDay(new Date(row.created_at)).toISOString().slice(0, 10);
    if (byDay.has(key)) {
      byDay.set(key, (byDay.get(key) ?? 0) + Number(row.price_paid));
    }
  }

  return [...byDay.entries()].map(([date, revenue]) => ({ date, revenue }));
}

export async function getRecentPurchases(limit = 8): Promise<RecentPurchase[]> {
  const serviceClient = createServiceClient();
  const purchasesQuery = await serviceClient
    .from("challenge_purchases")
    .select("id, user_id, challenge_size, price_paid, payment_status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const purchases = purchasesQuery.data as any[] | null;
  if (!purchases || purchases.length === 0) return [];

  const userIds = [...new Set(purchases.map((p) => p.user_id))];
  const usersQuery = await serviceClient.from("users").select("id, email").in("id", userIds);
  const emailsById = new Map((usersQuery.data as { id: string; email: string }[] ?? []).map((u) => [u.id, u.email]));

  return purchases.map((p) => ({
    id: p.id,
    email: emailsById.get(p.user_id) ?? "unknown",
    challenge_size: p.challenge_size,
    price_paid: Number(p.price_paid),
    payment_status: p.payment_status,
    created_at: p.created_at,
  }));
}

export async function getRecentResults(limit = 8): Promise<RecentResult[]> {
  const serviceClient = createServiceClient();
  const query = await serviceClient
    .from("user_challenges")
    .select("id, user_id, status, current_phase, created_at")
    .in("status", ["passed", "failed"])
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  const fundedQuery = await serviceClient
    .from("user_challenges")
    .select("id, user_id, created_at")
    .eq("status", "active")
    .eq("current_phase", 3)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (query.data as any[] | null) ?? [];
  const fundedRows = (fundedQuery.data as any[] | null) ?? [];

  const combined = [
    ...rows.map((r) => ({ id: r.id, user_id: r.user_id, outcome: r.status as "passed" | "failed", created_at: r.created_at })),
    ...fundedRows.map((r) => ({ id: r.id, user_id: r.user_id, outcome: "funded" as const, created_at: r.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);

  if (combined.length === 0) return [];

  const userIds = [...new Set(combined.map((c) => c.user_id))];
  const usersQuery = await serviceClient.from("users").select("id, email").in("id", userIds);
  const emailsById = new Map((usersQuery.data as { id: string; email: string }[] ?? []).map((u) => [u.id, u.email]));

  return combined.map((c) => ({
    id: c.id,
    email: emailsById.get(c.user_id) ?? "unknown",
    outcome: c.outcome,
    account_size: null,
    created_at: c.created_at,
  }));
}

export async function getInventoryHealth(): Promise<InventoryHealthRow[]> {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("trading_accounts").select("account_size, status");
  const rows = query.data as { account_size: number; status: string }[] | null;

  const bySize = new Map<number, { available: number; reserved: number; assigned: number; resetting: number; expired: number }>();

  for (const row of rows ?? []) {
    if (row.account_size === null) continue;
    if (!bySize.has(row.account_size)) {
      bySize.set(row.account_size, { available: 0, reserved: 0, assigned: 0, resetting: 0, expired: 0 });
    }
    const entry = bySize.get(row.account_size)!;
    if (row.status in entry) (entry as any)[row.status] += 1;
  }

  return [...bySize.entries()].sort((a, b) => a[0] - b[0]).map(([size, counts]) => {
    const total = counts.available + counts.reserved + counts.assigned + counts.resetting + counts.expired;
    const healthLevel: "healthy" | "low" | "critical" = counts.available === 0 ? "critical" : counts.available < LOW_INVENTORY_THRESHOLD ? "low" : "healthy";
    return { size, ...counts, total, healthLevel };
  });
}

export async function getSmartLoopStatus(): Promise<SmartLoopStatus> {
  const serviceClient = createServiceClient();
  const inventory = await getInventoryHealth();
  const lowInventorySizes = inventory.filter((i) => i.healthLevel !== "healthy").map((i) => i.size);

  const [waiting, slots] = await Promise.all([
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "awaiting_allocation"),
    serviceClient.from("vps_slots").select("current_user_challenge_id"),
  ]);

  const slotRows = slots.data as { current_user_challenge_id: string | null }[] | null;
  const activeSlots = (slotRows ?? []).filter((s) => s.current_user_challenge_id !== null).length;

  const challengeIds = (slotRows ?? []).map((s) => s.current_user_challenge_id).filter((id): id is string => !!id);
  const healthyQuery = challengeIds.length > 0
    ? await serviceClient.from("user_challenges").select("last_known_check_at").in("id", challengeIds)
    : { data: [] as any[] };

  const healthyCount = (healthyQuery.data as { last_known_check_at: string | null }[] ?? []).filter((c) => {
    if (!c.last_known_check_at) return false;
    return (Date.now() - new Date(c.last_known_check_at).getTime()) < 60 * 1000;
  }).length;

  return {
    waitingProvisioning: waiting.count ?? 0,
    lowInventorySizes,
    activeVpsSlots: activeSlots,
    healthyVpsSlots: healthyCount,
  };
}

export async function getSystemHealth(): Promise<SystemHealthItem[]> {
  const serviceClient = createServiceClient();

  const supabaseCheck = await serviceClient.from("users").select("id", { count: "exact", head: true });
  const supabaseHealthy = !supabaseCheck.error;

  const recentPollerCheck = await serviceClient
    .from("user_challenges")
    .select("last_known_check_at")
    .eq("status", "active")
    .not("last_known_check_at", "is", null)
    .order("last_known_check_at", { ascending: false })
    .limit(1);

  const rows = recentPollerCheck.data as { last_known_check_at: string }[] | null;
  const lastCheck = rows?.[0]?.last_known_check_at;
  const pollerHealthy = lastCheck ? (Date.now() - new Date(lastCheck).getTime()) < 60 * 1000 : null;

  const newsCheck = await serviceClient
    .from("news_events")
    .select("fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1);
  const newsRows = newsCheck.data as { fetched_at: string }[] | null;
  const lastNewsFetch = newsRows?.[0]?.fetched_at;
  const newsHealthy = lastNewsFetch ? (Date.now() - new Date(lastNewsFetch).getTime()) < 26 * 60 * 60 * 1000 : null;

  return [
    { name: "Supabase", status: supabaseHealthy ? "healthy" : "offline", detail: supabaseHealthy ? "Responding normally" : "Query failed" },
    { name: "VPS Pollers", status: pollerHealthy === null ? "unmonitored" : pollerHealthy ? "healthy" : "warning", detail: lastCheck ? `Last check ${new Date(lastCheck).toLocaleTimeString()}` : "No active accounts being watched" },
    { name: "Email Service (Resend)", status: "unmonitored", detail: "No live health check built yet — sends are fire-and-forget" },
    { name: "News Calendar Worker", status: newsHealthy === null ? "unmonitored" : newsHealthy ? "healthy" : "warning", detail: lastNewsFetch ? `Last fetch ${new Date(lastNewsFetch).toLocaleString()}` : "Never run yet" },
  ];
}

export async function getRecentActivity(limit = 15): Promise<ActivityItem[]> {
  const serviceClient = createServiceClient();

  const [users, purchases, challenges, payouts] = await Promise.all([
    serviceClient.from("users").select("email, created_at").order("created_at", { ascending: false }).limit(limit),
    serviceClient.from("challenge_purchases").select("user_id, challenge_size, payment_status, created_at").order("created_at", { ascending: false }).limit(limit),
    serviceClient.from("user_challenges").select("user_id, status, current_phase, created_at").order("created_at", { ascending: false }).limit(limit),
    serviceClient.from("payout_requests").select("user_id, amount, requested_at").order("requested_at", { ascending: false }).limit(limit),
  ]);

  const allUserIds = new Set<string>();
  (purchases.data as any[] ?? []).forEach((p) => allUserIds.add(p.user_id));
  (challenges.data as any[] ?? []).forEach((c) => allUserIds.add(c.user_id));
  (payouts.data as any[] ?? []).forEach((p) => allUserIds.add(p.user_id));

  const usersQuery = allUserIds.size > 0
    ? await serviceClient.from("users").select("id, email").in("id", [...allUserIds])
    : { data: [] as any[] };
  const emailsById = new Map((usersQuery.data as { id: string; email: string }[] ?? []).map((u) => [u.id, u.email]));

  const items: ActivityItem[] = [];

  for (const u of (users.data as any[] ?? [])) {
    items.push({ type: "User Registered", description: u.email, timestamp: u.created_at });
  }
  for (const p of (purchases.data as any[] ?? [])) {
    const email = emailsById.get(p.user_id) ?? "unknown";
    if (p.payment_status === "completed") {
      items.push({ type: "Payment Confirmed", description: `${email} — ${p.challenge_size}`, timestamp: p.created_at });
    } else {
      items.push({ type: "Challenge Purchased", description: `${email} — ${p.challenge_size}`, timestamp: p.created_at });
    }
  }
  for (const c of (challenges.data as any[] ?? [])) {
    const email = emailsById.get(c.user_id) ?? "unknown";
    if (c.status === "passed") items.push({ type: "Challenge Passed", description: email, timestamp: c.created_at });
    else if (c.status === "failed") items.push({ type: "Challenge Failed", description: email, timestamp: c.created_at });
    else if (c.status === "active" && c.current_phase === 3) items.push({ type: "Challenge Funded", description: email, timestamp: c.created_at });
    else items.push({ type: "Account Assigned", description: email, timestamp: c.created_at });
  }
  for (const p of (payouts.data as any[] ?? [])) {
    const email = emailsById.get(p.user_id) ?? "unknown";
    items.push({ type: "Payout Requested", description: `${email} — ₦${Number(p.amount).toLocaleString()}`, timestamp: p.requested_at });
  }

  return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
}
