import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Real, per-page permission check — called directly inside each
 * admin page's own server component. Super Admin always passes.
 * Everyone else needs a genuine stored 'read' (or higher) permission
 * row for the given module; no row means no_access, by design.
 */
export async function hasModuleAccess(module: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const serviceClient = createServiceClient();
  const profileQuery = await serviceClient.from("users").select("is_admin, admin_role").eq("id", user.id).single();
  const profile = profileQuery.data as { is_admin: boolean; admin_role: string | null } | null;
  if (!profile?.is_admin) return false;
  if (profile.admin_role === "super_admin") return true;

  const permQuery = await serviceClient.from("admin_permissions").select("permission_level").eq("admin_user_id", user.id).eq("module", module).maybeSingle();
  const level = (permQuery.data as { permission_level: string } | null)?.permission_level ?? "no_access";
  return level !== "no_access";
}
