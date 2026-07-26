import { createServiceClient } from "@/lib/supabase/service";

export interface InventoryStats {
  totalAccounts: number;
  available: number;
  assignedToChallenge: number;
  assignedToFunded: number;
  retired: number;
  healthPercent: number;
}

export type InventoryStage = "Available" | "Phase 1" | "Phase 2" | "Funded" | "Retired" | "Deleted" | "Reserved";

export interface InventoryRow {
  id: string;
  login: string;
  server: string | null;
  accountSize: number;
  stage: InventoryStage;
  assignedTraderEmail: string | null;
  balance: number | null;
  equity: number | null;
  vpsSlot: string | null;
  provisionStatus: "Provisioned" | "Available" | "Data Inconsistency";
  createdAt: string;
  lastSync: string | null;
}

export interface InventoryListResult {
  accounts: InventoryRow[];
  totalCount: number;
}

export interface LifecycleStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  current?: boolean;
}

export interface BalanceResetEntry {
  amount: number;
  processedAt: string;
}

export interface InventoryDetail {
  account: { login: string; investorPasswordMasked: string; server: string | null; accountSize: number; createdAt: string };
  assignment: { traderEmail: string | null; purchaseDate: string | null; challengeSize: number | null; currentPhase: number | null; assignedDate: string | null } | null;
  vps: { slot: string | null; monitorStatus: "online" | "delayed" | "offline" | "not_assigned"; lastHeartbeat: string | null };
  lifecycle: LifecycleStep[];
  balanceResetHistory: BalanceResetEntry[];
  stage: InventoryStage;
  linkedChallengeId: string | null;
  userId: string | null;
}

export interface InventoryMonitoring {
  available: number;
  lowInventorySizes: number[];
  offlineVps: number;
  provisionErrors: number;
  waitingAssignment: number;
  waitingDeletion: number;
  newestAccounts: { login: string; createdAt: string }[];
  oldestAvailable: { login: string; createdAt: string }[];
}

export interface InventoryCharts {
  byStage: { stage: string; count: number }[];
  bySize: { size: string; count: number }[];
  assignmentsThisMonth: number;
  retiredCount: number;
  availableCapacity: { size: string; available: number }[];
}

const LOW_INVENTORY_THRESHOLD = 3;
const STALE_SYNC_SECONDS = 60;
const OFFLINE_SYNC_SECONDS = 300;

function maskPassword(pw: string | null): string {
  if (!pw) return "—";
  return "•".repeat(Math.min(pw.length, 12));
}

function determineStage(accountStatus: string, linkedPhase: number | null): InventoryStage {
  if (accountStatus === "resetting") return "Retired";
  if (accountStatus === "expired") return "Deleted";
  if (accountStatus === "reserved") return "Reserved";
  if (accountStatus === "assigned" && linkedPhase !== null) {
    if (linkedPhase === 1) return "Phase 1";
    if (linkedPhase === 2) return "Phase 2";
    if (linkedPhase === 3) return "Funded";
  }
  return "Available";
}

async function getLinkedChallengeMap(serviceClient: ReturnType<typeof createServiceClient>, accountIds: string[]) {
  if (accountIds.length === 0) return new Map<string, any>();
  const query = await serviceClient
    .from("user_challenges")
    .select("id, trading_account_id, user_id, status, current_phase, created_at, last_known_balance, last_known_equity, last_known_check_at")
    .in("trading_account_id", accountIds)
    .eq("status", "active");
  const map = new Map<string, any>();
  for (const c of (query.data as any[]) ?? []) map.set(c.trading_account_id, c);
  return map;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("id, status");
  const accounts = (accountsQuery.data as { id: string; status: string }[]) ?? [];

  const assignedIds = accounts.filter((a) => a.status === "assigned").map((a) => a.id);
  const challengeMap = await getLinkedChallengeMap(serviceClient, assignedIds);

  let assignedChallenge = 0, assignedFunded = 0;
  for (const a of accounts) {
    if (a.status !== "assigned") continue;
    const linked = challengeMap.get(a.id);
    if (linked?.current_phase === 3) assignedFunded++;
    else assignedChallenge++;
  }

  const available = accounts.filter((a) => a.status === "available").length;
  const retired = accounts.filter((a) => a.status === "resetting").length;
  const total = accounts.length;

  return {
    totalAccounts: total,
    available,
    assignedToChallenge: assignedChallenge,
    assignedToFunded: assignedFunded,
    retired,
    healthPercent: total > 0 ? Math.round((available / total) * 100) : 0,
  };
}

export async function getInventoryPage(params: {
  search?: string;
  filter?: string;
  page: number;
  pageSize: number;
}): Promise<InventoryListResult> {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let query = serviceClient.from("trading_accounts").select("*");

  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`login.ilike.%${term}%,server.ilike.%${term}%,id.eq.${term}`);
  }

  const allMatchingQuery = await query.order("created_at", { ascending: false });
  let rows = (allMatchingQuery.data as any[]) ?? [];

  const accountIds = rows.map((r) => r.id);
  const challengeMap = await getLinkedChallengeMap(serviceClient, accountIds);

  const userIds = [...new Set([...challengeMap.values()].map((c) => c.user_id))];
  const usersQuery = userIds.length > 0
    ? await serviceClient.from("users").select("id, email").in("id", userIds)
    : { data: [] as any[] };
  const emailById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u.email]));

  const linkedChallengeIds = [...challengeMap.values()].map((c) => c.id);
  const slotsQuery = linkedChallengeIds.length > 0
    ? await serviceClient.from("vps_slots").select("slot_label, current_user_challenge_id").in("current_user_challenge_id", linkedChallengeIds)
    : { data: [] as any[] };
  const slotByChallenge = new Map((slotsQuery.data as any[] ?? []).map((s) => [s.current_user_challenge_id, s.slot_label]));

  let enriched: InventoryRow[] = rows.map((r) => {
    const linked = challengeMap.get(r.id);
    const stage = determineStage(r.status, linked?.current_phase ?? null);
    const provisionStatus: InventoryRow["provisionStatus"] =
      r.status === "assigned" && !linked ? "Data Inconsistency" : r.status === "assigned" ? "Provisioned" : "Available";

    return {
      id: r.id,
      login: r.login,
      server: r.server,
      accountSize: r.account_size,
      stage,
      assignedTraderEmail: linked ? emailById.get(linked.user_id) ?? null : null,
      balance: linked?.last_known_balance ?? null,
      equity: linked?.last_known_equity ?? null,
      vpsSlot: linked ? slotByChallenge.get(linked.id) ?? null : null,
      provisionStatus,
      createdAt: r.created_at,
      lastSync: linked?.last_known_check_at ?? null,
    };
  });

  const stageFilterMap: Record<string, InventoryStage> = {
    available: "Available", phase1: "Phase 1", phase2: "Phase 2",
    funded: "Funded", retired: "Retired", deleted: "Deleted",
  };
  if (stageFilterMap[filter]) enriched = enriched.filter((a) => a.stage === stageFilterMap[filter]);

  const totalCount = enriched.length;
  const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);

  return { accounts: pageItems, totalCount };
}

export async function getInventoryDetail(accountId: string): Promise<InventoryDetail | null> {
  const serviceClient = createServiceClient();

  const accountQuery = await serviceClient.from("trading_accounts").select("*").eq("id", accountId).single();
  const account = accountQuery.data as any;
  if (accountQuery.error || !account) return null;

  const challengeQuery = await serviceClient
    .from("user_challenges")
    .select("*")
    .eq("trading_account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const challenge = challengeQuery.data as any;

  const stage = determineStage(account.status, challenge?.current_phase ?? null);

  let assignment: InventoryDetail["assignment"] = null;
  let vpsSlot: string | null = null;
  let lifecycle: LifecycleStep[] = [
    { label: "Created", timestamp: account.created_at, reached: true },
    { label: "Available", timestamp: account.created_at, reached: true },
  ];
  let balanceResetHistory: BalanceResetEntry[] = [];

  if (challenge) {
    const userQuery = await serviceClient.from("users").select("email").eq("id", challenge.user_id).single();
    const user = userQuery.data as { email: string } | null;

    const purchasesQuery = await serviceClient
      .from("challenge_purchases")
      .select("created_at")
      .eq("user_id", challenge.user_id)
      .order("created_at", { ascending: false });
    const purchases = (purchasesQuery.data as { created_at: string }[]) ?? [];
    const closestPurchase = purchases.find((p) => new Date(p.created_at) <= new Date(challenge.created_at)) ?? purchases[purchases.length - 1];

    assignment = {
      traderEmail: user?.email ?? null,
      purchaseDate: closestPurchase?.created_at ?? null,
      challengeSize: account.account_size,
      currentPhase: challenge.current_phase,
      assignedDate: account.assigned_at,
    };

    const slotQuery = await serviceClient.from("vps_slots").select("slot_label").eq("current_user_challenge_id", challenge.id).maybeSingle();
    vpsSlot = (slotQuery.data as { slot_label: string } | null)?.slot_label ?? null;

    const payoutsQuery = await serviceClient
      .from("payout_requests")
      .select("amount, status, processed_at")
      .eq("user_id", challenge.user_id)
      .in("status", ["approved", "completed"])
      .not("processed_at", "is", null)
      .order("processed_at", { ascending: true });
    balanceResetHistory = ((payoutsQuery.data ?? []) as unknown as any[]).map((p) => ({ amount: Number(p.amount), processedAt: p.processed_at }));

    lifecycle.push({ label: "Assigned", timestamp: account.assigned_at ?? challenge.created_at, reached: true });
    lifecycle.push({ label: "Phase 1", timestamp: challenge.created_at, reached: true, current: challenge.current_phase === 1 });
    lifecycle.push({ label: "Phase 2", timestamp: challenge.phase1_passed_at, reached: challenge.current_phase >= 2, current: challenge.current_phase === 2 });
    lifecycle.push({ label: "Funded", timestamp: challenge.current_phase === 3 ? challenge.created_at : null, reached: challenge.current_phase === 3, current: challenge.current_phase === 3 && balanceResetHistory.length === 0 });

    if (balanceResetHistory.length > 0) {
      lifecycle.push({ label: `Balance Reset (×${balanceResetHistory.length})`, timestamp: balanceResetHistory[balanceResetHistory.length - 1].processedAt, reached: true, current: true });
    }
  } else {
    // No linked challenge found at all — either genuinely still
    // available, or (if account.status === 'assigned') a real data
    // inconsistency worth surfacing rather than hiding.
    lifecycle.push({ label: "Assigned", timestamp: null, reached: account.status !== "available" });
    lifecycle.push({ label: "Phase 1", timestamp: null, reached: false });
    lifecycle.push({ label: "Phase 2", timestamp: null, reached: false });
    lifecycle.push({ label: "Funded", timestamp: null, reached: false });
  }

  const isRetired = account.status === "resetting" || account.status === "expired";
  lifecycle.push({ label: "Retired", timestamp: isRetired ? (account.last_reset_at ?? null) : null, reached: isRetired, current: account.status === "resetting" });
  lifecycle.push({ label: "Deleted By Exness", timestamp: account.status === "expired" ? account.last_reset_at : null, reached: account.status === "expired" });

  const isStale = !challenge?.last_known_check_at || (Date.now() - new Date(challenge.last_known_check_at).getTime()) > STALE_SYNC_SECONDS * 1000;
  const isOffline = !challenge?.last_known_check_at || (Date.now() - new Date(challenge.last_known_check_at).getTime()) > OFFLINE_SYNC_SECONDS * 1000;
  const monitorStatus: InventoryDetail["vps"]["monitorStatus"] = !challenge ? "not_assigned" : isOffline ? "offline" : isStale ? "delayed" : "online";

  return {
    account: {
      login: account.login,
      investorPasswordMasked: maskPassword(account.investor_password),
      server: account.server,
      accountSize: account.account_size,
      createdAt: account.created_at,
    },
    assignment,
    vps: { slot: vpsSlot, monitorStatus, lastHeartbeat: challenge?.last_known_check_at ?? null },
    lifecycle,
    balanceResetHistory,
    stage,
    linkedChallengeId: challenge?.id ?? null,
    userId: challenge?.user_id ?? null,
  };
}

export async function getInventoryMonitoring(): Promise<InventoryMonitoring> {
  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("id, login, status, account_size, created_at");
  const accounts = (accountsQuery.data as any[]) ?? [];

  const bySize = new Map<number, number>();
  for (const a of accounts.filter((a) => a.status === "available")) {
    bySize.set(a.account_size, (bySize.get(a.account_size) ?? 0) + 1);
  }
  const lowInventorySizes = [...bySize.entries()].filter(([, count]) => count < LOW_INVENTORY_THRESHOLD).map(([size]) => size);

  const assignedIds = accounts.filter((a) => a.status === "assigned").map((a) => a.id);
  const challengesQuery = assignedIds.length > 0
    ? await serviceClient.from("user_challenges").select("trading_account_id, last_known_check_at").in("trading_account_id", assignedIds).eq("status", "active")
    : { data: [] as any[] };
  const offlineVps = ((challengesQuery.data as any[]) ?? []).filter((c) => !c.last_known_check_at || (Date.now() - new Date(c.last_known_check_at).getTime()) > OFFLINE_SYNC_SECONDS * 1000).length;

  const waitingAssignmentQuery = await serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "awaiting_allocation");

  const availableAccounts = accounts.filter((a) => a.status === "available").sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const newestAccounts = [...accounts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map((a) => ({ login: a.login, createdAt: a.created_at }));

  return {
    available: accounts.filter((a) => a.status === "available").length,
    lowInventorySizes,
    offlineVps,
    provisionErrors: waitingAssignmentQuery.count ?? 0,
    waitingAssignment: waitingAssignmentQuery.count ?? 0,
    waitingDeletion: accounts.filter((a) => a.status === "resetting").length,
    newestAccounts,
    oldestAvailable: availableAccounts.slice(0, 5).map((a) => ({ login: a.login, createdAt: a.created_at })),
  };
}

export async function getInventoryCharts(): Promise<InventoryCharts> {
  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("id, status, account_size, assigned_at");
  const accounts = (accountsQuery.data as any[]) ?? [];

  const assignedIds = accounts.filter((a) => a.status === "assigned").map((a) => a.id);
  const challengeMap = await getLinkedChallengeMap(serviceClient, assignedIds);

  const stageCounts = new Map<string, number>();
  const sizeCounts = new Map<number, number>();
  const availableBySize = new Map<number, number>();

  for (const a of accounts) {
    const linked = challengeMap.get(a.id);
    const stage = determineStage(a.status, linked?.current_phase ?? null);
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
    sizeCounts.set(a.account_size, (sizeCounts.get(a.account_size) ?? 0) + 1);
    if (a.status === "available") availableBySize.set(a.account_size, (availableBySize.get(a.account_size) ?? 0) + 1);
  }

  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const assignmentsThisMonth = accounts.filter((a) => a.assigned_at && a.assigned_at >= monthStart).length;
  const retiredCount = accounts.filter((a) => a.status === "resetting" || a.status === "expired").length;

  return {
    byStage: [...stageCounts.entries()].map(([stage, count]) => ({ stage, count })),
    bySize: [...sizeCounts.entries()].sort((a, b) => a[0] - b[0]).map(([size, count]) => ({ size: `₦${size.toLocaleString()}`, count })),
    assignmentsThisMonth,
    retiredCount,
    availableCapacity: [...availableBySize.entries()].sort((a, b) => a[0] - b[0]).map(([size, available]) => ({ size: `₦${size.toLocaleString()}`, available })),
  };
}

export async function getAwaitingAllocationForSize(accountSize: number) {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("id, user_id, challenge_id, created_at")
    .eq("status", "awaiting_allocation");
  const rows = (query.data as any[]) ?? [];

  const matching = rows.filter((r) => {
    const match = r.challenge_id.match(/(\d+)k/i);
    return match && Number(match[1]) * 1000 === accountSize;
  });

  const userIds = matching.map((r) => r.user_id);
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email").in("id", userIds) : { data: [] as any[] };
  const emailById = new Map((usersQuery.data as any[] ?? []).map((u) => [u.id, u.email]));

  return matching.map((r) => ({ challengeId: r.id, email: emailById.get(r.user_id) ?? "unknown", requestedAt: r.created_at }));
}
