import { createServiceClient } from "@/lib/supabase/service";

// Matches the real PAGE_MODULE_MAP order in middleware — the first
// module here that an admin genuinely has read-or-higher access to
// becomes their real destination, from any entry point (fresh
// sign-in, or setting a password after an invite/reset).
const MODULE_LANDING_PAGES: { module: string; href: string }[] = [
  { module: "Dashboard", href: "/admin" },
  { module: "Traders", href: "/admin/users" },
  { module: "Inventory", href: "/admin/inventory" },
  { module: "Provisioning Queue", href: "/admin/operations/provisioning-queue" },
  { module: "VPS Monitoring", href: "/admin/operations/vps-monitoring" },
  { module: "Finance", href: "/admin/finance/payments" },
  { module: "Risk", href: "/admin/risk/violations" },
  { module: "Support", href: "/admin/system/support" },
  { module: "Settings", href: "/admin/system/settings" },
];

export async function getRealAdminLandingPage(userId: string, isSuperAdmin: boolean): Promise<string> {
  if (isSuperAdmin) return "/admin";

  const serviceClient = createServiceClient();
  const permissionsQuery = await serviceClient
    .from("admin_permissions")
    .select("module, permission_level")
    .eq("admin_user_id", userId)
    .neq("permission_level", "no_access");

  const granted = new Set(((permissionsQuery.data ?? []) as unknown as { module: string }[]).map((p) => p.module));

  const firstAccessible = MODULE_LANDING_PAGES.find((m) => granted.has(m.module));
  return firstAccessible?.href ?? "/admin/access-denied";
}
