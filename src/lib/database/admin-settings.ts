import { createServiceClient } from "@/lib/supabase/service";

const STALE_HEARTBEAT_SECONDS = 60;

export interface SystemOverview {
  platformMode: string;
  provisioningServiceRunning: boolean;
  vpsMonitoringHealthy: boolean;
  emailQueueActive: boolean;
  activePersonalAreas: number;
}

export interface SettingsMap {
  [key: string]: string;
}

export async function getSystemOverview(): Promise<SystemOverview> {
  const serviceClient = createServiceClient();

  const modeQuery = await serviceClient.from("platform_settings").select("value").eq("key", "platform_mode").single();
  const platformMode = (modeQuery.data as { value: string } | null)?.value ?? "live";

  const recentCheckQuery = await serviceClient
    .from("user_challenges")
    .select("last_known_check_at")
    .eq("status", "active")
    .not("last_known_check_at", "is", null)
    .order("last_known_check_at", { ascending: false })
    .limit(1);
  const recentCheck = ((recentCheckQuery.data ?? []) as unknown as { last_known_check_at: string }[])[0];
  const isRecent = !!recentCheck && (Date.now() - new Date(recentCheck.last_known_check_at).getTime()) < STALE_HEARTBEAT_SECONDS * 1000;

  const paQuery = await serviceClient.from("personal_areas").select("id", { count: "exact", head: true }).eq("status", "connected");

  return {
    platformMode,
    provisioningServiceRunning: isRecent,
    vpsMonitoringHealthy: isRecent,
    emailQueueActive: true,
    activePersonalAreas: paQuery.count ?? 0,
  };
}

export async function getSettingsByKeys(keys: string[]): Promise<SettingsMap> {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("platform_settings").select("key, value").in("key", keys);
  const rows = ((query.data ?? []) as unknown as { key: string; value: string }[]);
  const map: SettingsMap = {};
  for (const r of rows) map[r.key] = r.value ?? "";
  return map;
}

export async function updateSettings(updates: Record<string, string>, adminId: string): Promise<void> {
  const serviceClient = createServiceClient();
  for (const [key, value] of Object.entries(updates)) {
    await (serviceClient.from("platform_settings") as any).upsert(
      { key, value, updated_at: new Date().toISOString(), updated_by: adminId },
      { onConflict: "key" }
    );
  }
}
