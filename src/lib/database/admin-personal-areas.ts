import { createServiceClient } from "@/lib/supabase/service";

const STALE_HEARTBEAT_SECONDS = 60;
const LOW_CAPACITY_THRESHOLD = 10;

export interface PaStats {
  totalPAs: number;
  totalAccounts: number;
  available: number;
  assigned: number;
  retired: number;
  avgCapacityPercent: number;
}

export interface PaCard {
  id: string;
  label: string;
  exnessEmail: string | null;
  status: string;
  totalAccounts: number;
  available: number;
  assigned: number;
  retired: number;
  lastAccountAdded: string | null;
  maxCapacity: number;
  capacityUsedPercent: number;
  isLowCapacity: boolean;
}

export interface AutomationInfo {
  provisioningEngineConnected: boolean;
  pythonServiceRunning: boolean;
  lastInventoryScan: string | null;
  accountsAvailable: number;
  accountsAssignedToday: number;
  provisionSuccessRatePercent: number;
}

export async function getPaStats(): Promise<PaStats> {
  const serviceClient = createServiceClient();

  const pasQuery = await serviceClient.from("personal_areas").select("id, max_capacity");
  const pas = ((pasQuery.data ?? []) as unknown as { id: string; max_capacity: number }[]);

  const accountsQuery = await serviceClient.from("trading_accounts").select("pa_label, status");
  const accounts = ((accountsQuery.data ?? []) as unknown as { pa_label: string | null; status: string }[]);

  const available = accounts.filter((a) => a.status === "available").length;
  const assigned = accounts.filter((a) => a.status === "assigned").length;
  const retired = accounts.filter((a) => a.status === "resetting" || a.status === "expired").length;

  const totalCapacity = pas.reduce((s, p) => s + p.max_capacity, 0);
  const avgCapacityPercent = totalCapacity > 0 ? Math.round((accounts.length / totalCapacity) * 100) : 0;

  return { totalPAs: pas.length, totalAccounts: accounts.length, available, assigned, retired, avgCapacityPercent };
}

export async function getPaCards(): Promise<PaCard[]> {
  const serviceClient = createServiceClient();

  const pasQuery = await serviceClient.from("personal_areas").select("*").order("label", { ascending: true });
  const pas = ((pasQuery.data ?? []) as unknown as any[]);

  const accountsQuery = await serviceClient.from("trading_accounts").select("pa_label, status, created_at");
  const accounts = ((accountsQuery.data ?? []) as unknown as { pa_label: string | null; status: string; created_at: string }[]);

  return pas.map((pa) => {
    const paAccounts = accounts.filter((a) => a.pa_label === pa.label);
    const available = paAccounts.filter((a) => a.status === "available").length;
    const assigned = paAccounts.filter((a) => a.status === "assigned").length;
    const retired = paAccounts.filter((a) => a.status === "resetting" || a.status === "expired").length;
    const lastAdded = paAccounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at ?? null;
    const capacityUsedPercent = pa.max_capacity > 0 ? Math.round((paAccounts.length / pa.max_capacity) * 100) : 0;

    return {
      id: pa.id,
      label: pa.label,
      exnessEmail: pa.exness_email,
      status: pa.status,
      totalAccounts: paAccounts.length,
      available,
      assigned,
      retired,
      lastAccountAdded: lastAdded,
      maxCapacity: pa.max_capacity,
      capacityUsedPercent,
      isLowCapacity: available < LOW_CAPACITY_THRESHOLD,
    };
  });
}

export async function getAutomationInfo(): Promise<AutomationInfo> {
  const serviceClient = createServiceClient();

  const recentCheckQuery = await serviceClient
    .from("user_challenges")
    .select("last_known_check_at")
    .eq("status", "active")
    .not("last_known_check_at", "is", null)
    .order("last_known_check_at", { ascending: false })
    .limit(1);
  const recentCheck = ((recentCheckQuery.data ?? []) as unknown as { last_known_check_at: string }[])[0];
  const pythonServiceRunning = !!recentCheck && (Date.now() - new Date(recentCheck.last_known_check_at).getTime()) < STALE_HEARTBEAT_SECONDS * 1000;

  const availableQuery = await serviceClient.from("trading_accounts").select("id", { count: "exact", head: true }).eq("status", "available");

  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();
  const assignedTodayQuery = await serviceClient.from("trading_accounts").select("id", { count: "exact", head: true }).eq("status", "assigned").gte("assigned_at", todayStart);

  const totalTodayQuery = await serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).gte("created_at", todayStart);
  const failedTodayQuery = await serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "awaiting_allocation").gte("created_at", todayStart);

  const total = totalTodayQuery.count ?? 0;
  const failed = failedTodayQuery.count ?? 0;
  const successRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;

  return {
    provisioningEngineConnected: true,
    pythonServiceRunning,
    lastInventoryScan: recentCheck?.last_known_check_at ?? null,
    accountsAvailable: availableQuery.count ?? 0,
    accountsAssignedToday: assignedTodayQuery.count ?? 0,
    provisionSuccessRatePercent: successRate,
  };
}

export interface PaAccountRow {
  mt5Login: string;
  challengeSize: number;
  status: string;
  assignedTraderName: string | null;
  createdAt: string;
  assignedDate: string | null;
  retiredDate: string | null;
  lastSync: string | null;
  vpsStatus: string;
}

export async function getPaAccounts(paLabel: string): Promise<PaAccountRow[]> {
  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("*").eq("pa_label", paLabel).order("created_at", { ascending: false });
  const accounts = ((accountsQuery.data ?? []) as unknown as any[]);

  const accountIds = accounts.map((a) => a.id);
  const challengesQuery = accountIds.length > 0
    ? await serviceClient.from("user_challenges").select("trading_account_id, user_id, status, current_phase, last_known_check_at").in("trading_account_id", accountIds).eq("status", "active")
    : { data: [] as any[] };
  const challengeByAccount = new Map(((challengesQuery.data ?? []) as unknown as any[]).map((c) => [c.trading_account_id, c]));

  const userIds = [...new Set([...challengeByAccount.values()].map((c) => c.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  const slotsQuery = await serviceClient.from("vps_slots").select("current_user_challenge_id, slot_label");
  const slotByChallenge = new Map(((slotsQuery.data ?? []) as unknown as any[]).map((s) => [s.current_user_challenge_id, s.slot_label]));

  return accounts.map((a) => {
    const linked = challengeByAccount.get(a.id);
    const user = linked ? userById.get(linked.user_id) : null;

    let status = "Available";
    if (a.status === "resetting") status = "Retired";
    else if (a.status === "expired") status = "Deleted";
    else if (linked) status = linked.current_phase === 3 ? "Funded" : `Phase ${linked.current_phase}`;

    const hasSlot = linked ? slotByChallenge.get(linked.id) : null;
    const isStale = !linked?.last_known_check_at || (Date.now() - new Date(linked.last_known_check_at).getTime()) > STALE_HEARTBEAT_SECONDS * 1000;
    const vpsStatus = !linked ? "Not Assigned" : !hasSlot ? "Assigned" : isStale ? "Offline" : "Monitoring";

    return {
      mt5Login: a.login,
      challengeSize: a.account_size,
      status,
      assignedTraderName: user?.full_name ?? user?.email ?? null,
      createdAt: a.created_at,
      assignedDate: a.assigned_at,
      retiredDate: a.status === "resetting" || a.status === "expired" ? a.last_reset_at : null,
      lastSync: linked?.last_known_check_at ?? null,
      vpsStatus,
    };
  });
}

export interface ProvisionHistoryEntry {
  time: string;
  traderName: string | null;
  challengeSize: number | null;
  accountLogin: string | null;
  success: boolean;
  reason: string | null;
}

export async function getPaProvisionHistory(paLabel: string, limit = 30): Promise<ProvisionHistoryEntry[]> {
  const serviceClient = createServiceClient();

  const accountsQuery = await serviceClient.from("trading_accounts").select("id, login, account_size").eq("pa_label", paLabel).eq("status", "assigned");
  const accounts = ((accountsQuery.data ?? []) as unknown as any[]);
  const accountIds = accounts.map((a) => a.id);
  const accountById = new Map(accounts.map((a) => [a.id, a]));

  if (accountIds.length === 0) return [];

  const challengesQuery = await serviceClient.from("user_challenges").select("user_id, trading_account_id, created_at").in("trading_account_id", accountIds).order("created_at", { ascending: false }).limit(limit);
  const challenges = ((challengesQuery.data ?? []) as unknown as any[]);

  const userIds = [...new Set(challenges.map((c) => c.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  return challenges.map((c) => {
    const account = accountById.get(c.trading_account_id);
    const user = userById.get(c.user_id);
    return {
      time: c.created_at,
      traderName: user?.full_name ?? user?.email ?? null,
      challengeSize: account?.account_size ?? null,
      accountLogin: account?.login ?? null,
      success: true,
      reason: null,
    };
  });
}
