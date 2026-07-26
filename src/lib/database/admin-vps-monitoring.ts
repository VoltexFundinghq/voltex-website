import { createServiceClient } from "@/lib/supabase/service";

export interface VpsStats {
  onlineSlots: number;
  offlineSlots: number;
  avgCpuPercent: number;
  avgRamPercent: number;
}

export type HeartbeatStatus = "healthy" | "delayed" | "offline" | "idle";

export interface SlotRow {
  slotLabel: string;
  machineLabel: string | null;
  accountLogin: string | null;
  traderName: string | null;
  challengeStage: string | null;
  status: HeartbeatStatus;
  lastHeartbeat: string | null;
}

export interface MachineRow {
  label: string;
  cpuPercent: number | null;
  ramPercent: number | null;
  diskPercent: number | null;
  lastReportedAt: string | null;
  healthLevel: "healthy" | "warning" | "critical" | "unknown";
}

export interface VpsMonitoringData {
  machines: MachineRow[];
  slots: SlotRow[];
  coveragePercent: number;
}

const HEALTHY_SECONDS = 60;
const DELAYED_SECONDS = 300;
const MACHINE_STALE_SECONDS = 120;
const HEARTBEAT_INTERVAL_SECONDS = 10; // confirmed constant, from the poller's own POLL_INTERVAL_SECONDS

function computeHeartbeatStatus(lastCheck: string | null): HeartbeatStatus {
  if (!lastCheck) return "idle";
  const seconds = (Date.now() - new Date(lastCheck).getTime()) / 1000;
  if (seconds < HEALTHY_SECONDS) return "healthy";
  if (seconds < DELAYED_SECONDS) return "delayed";
  return "offline";
}

function computeMachineHealth(machine: any): "healthy" | "warning" | "critical" | "unknown" {
  if (!machine.last_reported_at) return "unknown";
  const secondsSinceReport = (Date.now() - new Date(machine.last_reported_at).getTime()) / 1000;
  if (secondsSinceReport > MACHINE_STALE_SECONDS) return "unknown";

  const cpu = machine.cpu_percent ?? 0;
  const ram = machine.ram_percent ?? 0;
  const disk = machine.disk_percent ?? 0;

  if (cpu >= 90 || ram >= 90 || disk >= 90) return "critical";
  if (cpu >= 70 || ram >= 70 || disk >= 80) return "warning";
  return "healthy";
}

export async function getVpsMonitoringData(): Promise<VpsMonitoringData> {
  const serviceClient = createServiceClient();

  const machinesQuery = await serviceClient.from("vps_machines").select("*");
  const machines = ((machinesQuery.data ?? []) as unknown as any[]).map((m) => ({
    label: m.label,
    cpuPercent: m.cpu_percent,
    ramPercent: m.ram_percent,
    diskPercent: m.disk_percent,
    lastReportedAt: m.last_reported_at,
    healthLevel: computeMachineHealth(m),
  }));

  const slotsQuery = await serviceClient.from("vps_slots").select("slot_label, current_user_challenge_id, vps_machine_id");
  const slotRows = ((slotsQuery.data ?? []) as unknown as any[]);

  const machineIdToLabel = new Map(((machinesQuery.data ?? []) as unknown as any[]).map((m) => [m.id, m.label]));

  const challengeIds = slotRows.map((s) => s.current_user_challenge_id).filter(Boolean);
  const challengesQuery = challengeIds.length > 0
    ? await serviceClient.from("user_challenges").select("id, user_id, account_login, current_phase, last_known_check_at").in("id", challengeIds)
    : { data: [] as any[] };
  const challengeById = new Map(((challengesQuery.data ?? []) as unknown as any[]).map((c) => [c.id, c]));

  const userIds = [...new Set([...challengeById.values()].map((c) => c.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  const slots: SlotRow[] = slotRows.map((s) => {
    const challenge = s.current_user_challenge_id ? challengeById.get(s.current_user_challenge_id) : null;
    const user = challenge ? userById.get(challenge.user_id) : null;

    return {
      slotLabel: s.slot_label,
      machineLabel: s.vps_machine_id ? machineIdToLabel.get(s.vps_machine_id) ?? null : null,
      accountLogin: challenge?.account_login ?? null,
      traderName: user?.full_name ?? user?.email ?? null,
      challengeStage: challenge ? (challenge.current_phase === 3 ? "Funded" : `Phase ${challenge.current_phase}`) : null,
      status: challenge ? computeHeartbeatStatus(challenge.last_known_check_at) : "idle",
      lastHeartbeat: challenge?.last_known_check_at ?? null,
    };
  });

  const activeCount = slots.filter((s) => s.accountLogin !== null).length;
  const healthyCount = slots.filter((s) => s.status === "healthy").length;
  const coveragePercent = activeCount > 0 ? Math.round((healthyCount / activeCount) * 100) : 100;

  return { machines, slots, coveragePercent };
}

export async function getVpsStats(): Promise<VpsStats> {
  const data = await getVpsMonitoringData();
  const withAccounts = data.slots.filter((s) => s.accountLogin !== null);
  const onlineSlots = withAccounts.filter((s) => s.status === "healthy" || s.status === "delayed").length;
  const offlineSlots = withAccounts.filter((s) => s.status === "offline").length;

  const validMachines = data.machines.filter((m) => m.cpuPercent !== null);
  const avgCpu = validMachines.length > 0 ? Math.round(validMachines.reduce((s, m) => s + (m.cpuPercent ?? 0), 0) / validMachines.length) : 0;
  const avgRam = validMachines.length > 0 ? Math.round(validMachines.reduce((s, m) => s + (m.ramPercent ?? 0), 0) / validMachines.length) : 0;

  return { onlineSlots, offlineSlots, avgCpuPercent: avgCpu, avgRamPercent: avgRam };
}
