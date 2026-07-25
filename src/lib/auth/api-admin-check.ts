import { createClient } from "@/lib/supabase/server";

export async function checkAdminForApi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const profileQuery = await supabase.from("users").select("is_admin").eq("id", user.id).single();
  const profile = profileQuery.data as { is_admin: boolean } | null;
  if (!profile?.is_admin) return null;

  return user;
}
