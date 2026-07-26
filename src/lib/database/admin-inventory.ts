import { createServiceClient } from "@/lib/supabase/service";

export interface InventoryStats {
  totalAccounts: number;
  available: number;
  assignedEvaluation: number;
  assignedFunded: number;
  retired: number;
  healthLabel: string;
  healthDetail: string;
  healthLevel: "healthy" | "low" | "critical";
}

export type InventoryStage = "Available" | "Phase 1" | "Phase 2" | "Funded" | "Retired" | "Deleted" | "Reserved";
export type VpsStatus = "not_assigned" | "assigned" | "monitoring" | "offline" | "error";

export interface InventoryRow {
  id: string;
  login: string;
  server: string | null;
  accountSize: number;
  stage: InventoryStage;
  assignedTraderName: string | null;
  assignedPhaseLabel: string | null;
  startingBalance: number;
  currentBalance: number | null;
  currentEquity: number | null;
  vpsSlot: string | null;
  vpsStatus: VpsStatus;
  createdAt: string;
  lastSync: string | null;
  hasLinkedChallenge: boolean;
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

export interface InventoryDetail {
  account: { login: string; investorPasswordMasked: string; server: string | null; accountSize: number; stage: InventoryStage; startingBalance: number; currentBalance: number | null; currentEquity: number | null; createdAt: string };
  assignment: { traderName: string | null; traderEmail: string | null; currentPhase: number | null; purchaseReference: string | null; assignedDate: string | null } | null;
  vps: { status: VpsStatus; slot: string | null; lastHeartbeat: string | null };
  lifecycle: LifecycleStep[];
  fundedInfo: { balanceResetCount: number; lastBalanceReset: string | null; profitSplit: number | null; payoutCount: number } | null;
  retiredInfo: { reason: "Failed Challenge" | "Manual Retirement"; retirementDate: string | null; daysRemaining: number | null } | null;
}

export interface InventoryMonitoring {
  available: number;
  assignedEvaluation: number;
  assignedFunded: number;
  retired: number;
  awaitingVpsConnection: number;
  offlineVps: number;
  provisionQueueSize: number;
}

export interface InventoryCharts {
  byStage: { stage: string; count: number }[];
  bySize: { size: string; count: number }[];
  availableCapacity: { size: string; available: number }[];
}

const LOW_INVENTORY_THRESHOLD = 3;
const STALE_SYNC_SECONDS = 60;
const OFFLINE_SYNC_SECONDS = 300;
const DELETION_WINDOW_DAYS = 21;

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

function determineVpsStatus(accountStatus: string, linked: any | null, vpsSlot: string | null): VpsStatus {
  if (accountStatus !== "assigned") return "not_assigned";
  if (!linked) return "error"; // assigned but no active challenge found — genuine data inconsistency
  if (!vpsSlot) return "assigned"; // linked, but no poller has picked it up yet
  const isOffline = !linked.last_known_check_at || (Date.now() - new Date(linked.last_known_check_at).getTime()) > OFFLINE_SYNC_SECONDS * 1000;
  return isOffline ? "offline" : "monitoring";
}

async function getLinkedChallengeMap(serviceClient: ReturnType<typeof createServiceClient>, accountIds: string[]) {
  if (accountIds.length === 0) return new Map<string, any>();
  const query = await serviceClient
    .from("user_challenges")
    .select("id, trading_account_id, user_id, status, current_phase, created_at, last_known_balance, last_known_equity, last_known_check_at")
    .in("trading_account_id", accountIds)
    .eq("status", "active");
  const map = new Map<string, any>();
  for (const c of ((query.data ?? []) as unknown as any[])) map.set(c.trading_account_id, c);
  return map;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("id, status");
  const accounts = ((accountsQuery.data ?? []) as unknown as { id: string; status: string }[]);

  const assignedIds = accounts.filter((a) => a.status === "assigned").map((a) => a.id);
  const challengeMap = await getLinkedChallengeMap(serviceClient, assignedIds);

  let assignedEvaluation = 0, assignedFunded = 0;
  for (const a of accounts) {
    if (a.status !== "assigned") continue;
    const linked = challengeMap.get(a.id);
    if (linked?.current_phase === 3) assignedFunded++;
    else assignedEvaluation++;
  }

  const available = accounts.filter((a) => a.status === "available").length;
  const retired = accounts.filter((a) => a.status === "resetting").length;
  const total = accounts.length;

  let healthLabel: string, healthDetail: string, healthLevel: "healthy" | "low" | "critical";
  if (available === 0) {
    healthLabel = "Provisioning Required";
    healthDetail = "No Available Accounts";
    healthLevel = "critical";
  } else if (available < LOW_INVENTORY_THRESHOLD) {
    healthLabel = "Low Inventory";
    healthDetail = `${available} Available`;
    healthLevel = "low";
  } else {
    healthLabel = "Healthy";
    healthDetail = `${available} Available`;
    healthLevel = "healthy";
  }

  return {
    totalAccounts: total,
    available,
    assignedEvaluation,
    assignedFunded,
    retired,
    healthLabel,
    healthDetail,
    healthLevel,
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
  let rows = ((allMatchingQuery.data ?? []) as unknown as any[]);

  const accountIds = rows.map((r) => r.id);
  const challengeMap = await getLinkedChallengeMap(serviceClient, accountIds);

  const userIds = [...new Set([...challengeMap.values()].map((c) => c.user_id))];
  const usersQuery = userIds.length > 0
    ? await serviceClient.from("users").select("id, full_name, email").in("id", userIds)
    : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  const linkedChallengeIds = [...challengeMap.values()].map((c) => c.id);
  const slotsQuery = linkedChallengeIds.length > 0
    ? await serviceClient.from("vps_slots").select("slot_label, current_user_challenge_id").in("current_user_challenge_id", linkedChallengeIds)
    : { data: [] as any[] };
  const slotByChallenge = new Map(((slotsQuery.data ?? []) as unknown as any[]).map((s) => [s.current_user_challenge_id, s.slot_label]));

  let enriched: InventoryRow[] = rows.map((r) => {
    const linked = challengeMap.get(r.id);
    const stage = determineStage(r.status, linked?.current_phase ?? null);
    const vpsSlot = linked ? slotByChallenge.get(linked.id) ?? null : null;
    const vpsStatus = determineVpsStatus(r.status, linked ?? null, vpsSlot);
    const user = linked ? userById.get(linked.user_id) : null;

    return {
      id: r.id,
      login: r.login,
      server: r.server,
      accountSize: r.account_size,
      stage,
      assignedTraderName: user?.full_name ?? user?.email ?? null,
      assignedPhaseLabel: linked ? (linked.current_phase === 3 ? "Funded" : `Phase ${linked.current_phase}`) : null,
      startingBalance: r.account_size,
      currentBalance: linked?.last_known_balance ?? null,
      currentEquity: linked?.last_known_equity ?? null,
      vpsSlot,
      vpsStatus,
      createdAt: r.created_at,
      lastSync: linked?.last_known_check_at ?? null,
      hasLinkedChallenge: !!linked,
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

  const activeChallengeQuery = await serviceClient
    .from("user_challenges")
    .select("*")
    .eq("trading_account_id", accountId)
    .eq("status", "active")
    .maybeSingle();
  const challenge = activeChallengeQuery.data as any;

  const stage = determineStage(account.status, challenge?.current_phase ?? null);

  let assignment: InventoryDetail["assignment"] = null;
  let vpsSlot: string | null = null;
  let lifecycle: LifecycleStep[] = [
    { label: "Inventory Created", timestamp: account.created_at, reached: true },
  ];
  let fundedInfo: InventoryDetail["fundedInfo"] = null;
  let retiredInfo: InventoryDetail["retiredInfo"] = null;

  if (challenge) {
    const userQuery = await serviceClient.from("users").select("full_name, email").eq("id", challenge.user_id).single();
    const user = userQuery.data as { full_name: string | null; email: string } | null;

    const purchasesQuery = await serviceClient
      .from("challenge_purchases")
      .select("id, created_at")
      .eq("user_id", challenge.user_id)
      .order("created_at", { ascending: false });
    const purchases = ((purchasesQuery.data ?? []) as unknown as { id: string; created_at: string }[]);
    const closestPurchase = purchases.find((p) => new Date(p.created_at) <= new Date(challenge.created_at)) ?? purchases[purchases.length - 1];

    assignment = {
      traderName: user?.full_name ?? null,
      traderEmail: user?.email ?? null,
      currentPhase: challenge.current_phase,
      purchaseReference: closestPurchase?.id ?? null,
      assignedDate: account.assigned_at,
    };

    const slotQuery = await serviceClient.from("vps_slots").select("slot_label").eq("current_user_challenge_id", challenge.id).maybeSingle();
    vpsSlot = (slotQuery.data as { slot_label: string } | null)?.slot_label ?? null;

    lifecycle.push({ label: "Assigned to Trader", timestamp: account.assigned_at ?? challenge.created_at, reached: true });
    lifecycle.push({ label: "Phase 1", timestamp: challenge.created_at, reached: true, current: challenge.current_phase === 1 });
    lifecycle.push({ label: "Phase 2", timestamp: challenge.phase1_passed_at, reached: challenge.current_phase >= 2, current: challenge.current_phase === 2 });
    lifecycle.push({ label: "Funded", timestamp: challenge.current_phase === 3 ? challenge.created_at : null, reached: challenge.current_phase === 3, current: challenge.current_phase === 3 });

    if (challenge.current_phase === 3) {
      const payoutsQuery = await serviceClient
        .from("payout_requests")
        .select("amount, status, requested_at, processed_at")
        .eq("user_id", challenge.user_id)
        .gte("requested_at", challenge.created_at)
        .order("requested_at", { ascending: true });
      const payouts = ((payoutsQuery.data ?? []) as unknown as any[]);
      const approved = payouts.filter((p) => p.status === "approved" || p.status === "completed");
      const resetsWithDate = approved.filter((p) => p.processed_at);

      fundedInfo = {
        balanceResetCount: resetsWithDate.length,
        lastBalanceReset: resetsWithDate.length > 0 ? resetsWithDate[resetsWithDate.length - 1].processed_at : null,
        profitSplit: Number(challenge.profit_split),
        payoutCount: approved.length,
      };
    }
  } else {
    lifecycle.push({ label: "Assigned to Trader", timestamp: null, reached: account.status !== "available" });
    lifecycle.push({ label: "Phase 1", timestamp: null, reached: false });
    lifecycle.push({ label: "Phase 2", timestamp: null, reached: false });
    lifecycle.push({ label: "Funded", timestamp: null, reached: false });
  }

  const isRetired = account.status === "resetting" || account.status === "expired";
  lifecycle.push({ label: isRetired ? "Retired" : "Retired (if applicable)", timestamp: isRetired ? account.last_reset_at : null, reached: isRetired, current: account.status === "resetting" });
  lifecycle.push({ label: "Deleted By Exness", timestamp: account.status === "expired" ? account.last_reset_at : null, reached: account.status === "expired" });

  if (isRetired) {
    const failedChallengeQuery = await serviceClient
      .from("user_challenges")
      .select("id, completed_at")
      .eq("trading_account_id", accountId)
      .eq("status", "failed")
      .maybeSingle();
    const failedChallenge = failedChallengeQuery.data as { id: string; completed_at: string | null } | null;

    const reason: "Failed Challenge" | "Manual Retirement" = failedChallenge ? "Failed Challenge" : "Manual Retirement";
    const retirementDate = failedChallenge?.completed_at ?? account.last_reset_at ?? null;

    let daysRemaining: number | null = null;
    if (account.status === "resetting" && account.last_known_activity_at) {
      const daysSince = Math.floor((Date.now() - new Date(account.last_known_activity_at).getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = DELETION_WINDOW_DAYS - daysSince;
    }

    retiredInfo = { reason, retirementDate, daysRemaining };
  }

  const vpsStatus = determineVpsStatus(account.status, challenge ?? null, vpsSlot);

  return {
    account: {
      login: account.login,
      investorPasswordMasked: maskPassword(account.investor_password),
      server: account.server,
      accountSize: account.account_size,
      stage,
      startingBalance: account.account_size,
      currentBalance: challenge?.last_known_balance ?? null,
      currentEquity: challenge?.last_known_equity ?? null,
      createdAt: account.created_at,
    },
    assignment,
    vps: { status: vpsStatus, slot: vpsSlot, lastHeartbeat: challenge?.last_known_check_at ?? null },
    lifecycle,
    fundedInfo,
    retiredInfo,
  };
}

export async function getInventoryMonitoring(): Promise<InventoryMonitoring> {
  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("id, status");
  const accounts = ((accountsQuery.data ?? []) as unknown as { id: string; status: string }[]);

  const assignedIds = accounts.filter((a) => a.status === "assigned").map((a) => a.id);
  const challengeMap = await getLinkedChallengeMap(serviceClient, assignedIds);

  const linkedChallengeIds = [...challengeMap.values()].map((c) => c.id);
  const slotsQuery = linkedChallengeIds.length > 0
    ? await serviceClient.from("vps_slots").select("slot_label, current_user_challenge_id").in("current_user_challenge_id", linkedChallengeIds)
    : { data: [] as any[] };
  const slotByChallenge = new Map(((slotsQuery.data ?? []) as unknown as any[]).map((s) => [s.current_user_challenge_id, s.slot_label]));

  let assignedEvaluation = 0, assignedFunded = 0, awaitingVpsConnection = 0, offlineVps = 0;

  for (const a of accounts) {
    if (a.status !== "assigned") continue;
    const linked = challengeMap.get(a.id);
    if (linked?.current_phase === 3) assignedFunded++;
    else assignedEvaluation++;

    if (linked) {
      const vpsSlot = slotByChallenge.get(linked.id);
      if (!vpsSlot) awaitingVpsConnection++;
      else {
        const isOffline = !linked.last_known_check_at || (Date.now() - new Date(linked.last_known_check_at).getTime()) > OFFLINE_SYNC_SECONDS * 1000;
        if (isOffline) offlineVps++;
      }
    }
  }

  const queueQuery = await serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "awaiting_allocation");

  return {
    available: accounts.filter((a) => a.status === "available").length,
    assignedEvaluation,
    assignedFunded,
    retired: accounts.filter((a) => a.status === "resetting").length,
    awaitingVpsConnection,
    offlineVps,
    provisionQueueSize: queueQuery.count ?? 0,
  };
}

export async function getInventoryCharts(): Promise<InventoryCharts> {
  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("id, status, account_size");
  const accounts = ((accountsQuery.data ?? []) as unknown as any[]);

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

  return {
    byStage: [...stageCounts.entries()].map(([stage, count]) => ({ stage, count })),
    bySize: [...sizeCounts.entries()].sort((a, b) => a[0] - b[0]).map(([size, count]) => ({ size: `₦${size.toLocaleString()}`, count })),
    availableCapacity: [...availableBySize.entries()].sort((a, b) => a[0] - b[0]).map(([size, available]) => ({ size: `₦${size.toLocaleString()}`, available })),
  };
}

export async function getAwaitingAllocationForSize(accountSize: number) {
  const serviceClient = createServiceClient();

  const query = await serviceClient
    .from("user_challenges")
    .select("id, user_id, challenge_id, created_at")
    .eq("status", "awaiting_allocation");
  const rows = ((query.data ?? []) as unknown as any[]);

  const matching = rows.filter((r) => {
    const match = r.challenge_id.match(/(\d+)k/i);
    return match && Number(match[1]) * 1000 === accountSize;
  });

  const userIds = matching.map((r) => r.user_id);
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, email").in("id", userIds) : { data: [] as any[] };
  const emailById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u.email]));

  return matching.map((r) => ({ challengeId: r.id, email: emailById.get(r.user_id) ?? "unknown", requestedAt: r.created_at }));
}
