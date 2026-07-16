import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types/database";

/**
 * Fetches the full profile row for the currently logged-in user.
 * Returns null if not logged in or no profile exists.
 */
export async function getProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data;
}
