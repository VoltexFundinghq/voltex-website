import { createServiceClient } from "@/lib/supabase/service";

export const PERMISSION_MODULES = ["Dashboard", "Traders", "Inventory", "Provisioning Queue", "VPS Monitoring", "Risk", "Finance", "Settings"] as const;

export interface AdminStats {
  totalAdmins: number;
  superAdmins: number;
  activeSessionsApprox: number;
  lastLoginToday: number;
  pendingInvitations: number;
  suspendedAdmins: number;
}

export interface AdminRow {
  id: string;
  fullName: string | null;
  email: string;
  role: string | null;
  isSuspended: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  isPendingInvite: boolean;
}

async function getAuthUserMap(serviceClient: ReturnType<typeof createServiceClient>, userIds: string[]) {
  const map = new Map<string, { last_sign_in_at: string | null }>();
  for (const id of userIds) {
    try {
      const result = await serviceClient.auth.admin.getUserById(id);
      if (result.data?.user) map.set(id, { last_sign_in_at: result.data.user.last_sign_in_at ?? null });
    } catch {
      // If auth lookup fails for any single user, skip it rather than fail the whole page
    }
  }
  return map;
}

export async function getAdminStats(): Promise<AdminStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const adminsQuery = await serviceClient.from("users").select("id, admin_role, is_suspended").eq("is_admin", true);
  const admins = ((adminsQuery.data ?? []) as unknown as any[]);

  const authMap = await getAuthUserMap(serviceClient, admins.map((a) => a.id));
  const lastLoginToday = admins.filter((a) => {
    const auth = authMap.get(a.id);
    return auth?.last_sign_in_at && auth.last_sign_in_at >= todayStart;
  }).length;
  const pendingInvitations = admins.filter((a) => !authMap.get(a.id)?.last_sign_in_at).length;

  let activeSessionsApprox = 0;
  try {
    const sessionsQuery = await (serviceClient.rpc as any)("count_active_admin_sessions");
    activeSessionsApprox = sessionsQuery.data ?? 0;
  } catch {
    activeSessionsApprox = 0;
  }

  return {
    totalAdmins: admins.length,
    superAdmins: admins.filter((a) => a.admin_role === "super_admin").length,
    activeSessionsApprox,
    lastLoginToday,
    pendingInvitations,
    suspendedAdmins: admins.filter((a) => a.is_suspended).length,
  };
}

export async function getAdminsList(params: { search?: string; filter?: string }): Promise<AdminRow[]> {
  const serviceClient = createServiceClient();
  const { search, filter = "all" } = params;

  let query = serviceClient.from("users").select("*").eq("is_admin", true);
  if (search && search.trim()) {
    const term = search.trim();
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  }

  const allQuery = await query.order("created_at", { ascending: false });
  let rows = ((allQuery.data ?? []) as unknown as any[]);

  const authMap = await getAuthUserMap(serviceClient, rows.map((r) => r.id));

  let result: AdminRow[] = rows.map((r) => {
    const auth = authMap.get(r.id);
    return {
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      role: r.admin_role,
      isSuspended: r.is_suspended ?? false,
      lastSignInAt: auth?.last_sign_in_at ?? null,
      createdAt: r.created_at,
      isPendingInvite: !auth?.last_sign_in_at,
    };
  });

  if (filter === "suspended") result = result.filter((a) => a.isSuspended);
  else if (filter !== "all") {
    const roleMap: Record<string, string> = { super_admin: "super_admin", operations: "operations", risk: "risk_manager", finance: "finance", support: "support" };
    if (roleMap[filter]) result = result.filter((a) => a.role === roleMap[filter]);
  }

  return result;
}

export interface AdminDetail {
  profile: { fullName: string | null; email: string; phone: string | null; role: string | null; createdAt: string; lastSignInAt: string | null; isSuspended: boolean };
  permissions: { module: string; level: string }[];
  recentActivity: { eventName: string; timestamp: string; description: string | null }[];
  loginNote: string;
}

export async function getAdminDetail(adminId: string): Promise<AdminDetail | null> {
  const serviceClient = createServiceClient();

  const userQuery = await serviceClient.from("users").select("*").eq("id", adminId).eq("is_admin", true).single();
  const user = userQuery.data as any;
  if (userQuery.error || !user) return null;

  const authResult = await serviceClient.auth.admin.getUserById(adminId);
  const lastSignInAt = authResult.data?.user?.last_sign_in_at ?? null;

  const permissionsQuery = await serviceClient.from("admin_permissions").select("module, permission_level").eq("admin_user_id", adminId);
  const existingPerms = new Map(((permissionsQuery.data ?? []) as unknown as any[]).map((p) => [p.module, p.permission_level]));
  const permissions = PERMISSION_MODULES.map((m) => ({ module: m, level: existingPerms.get(m) ?? "no_access" }));

  const activityQuery = await serviceClient.from("audit_events").select("event_name, occurred_at, description").eq("user_id", adminId).order("occurred_at", { ascending: false }).limit(15);
  const recentActivity = ((activityQuery.data ?? []) as unknown as any[]).map((e) => ({ eventName: e.event_name, timestamp: e.occurred_at, description: e.description }));

  return {
    profile: { fullName: user.full_name, email: user.email, phone: user.phone, role: user.admin_role, createdAt: user.created_at, lastSignInAt, isSuspended: user.is_suspended ?? false },
    permissions,
    recentActivity,
    loginNote: "Login history with IP/device/location is not captured in our system — only the most recent sign-in time is available.",
  };
}

export async function logAdminAuditEvent(serviceClient: ReturnType<typeof createServiceClient>, targetUserId: string, eventName: string, description: string) {
  await (serviceClient.from("audit_events") as any).insert({
    event_name: eventName,
    category: "Admin",
    result: "success",
    user_id: targetUserId,
    source: "Admin",
    description,
    occurred_at: new Date().toISOString(),
  });
}
