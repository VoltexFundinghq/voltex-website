import { createServiceClient } from "@/lib/supabase/service";

/** Returns the user IDs of every account currently flagged is_admin. */
export async function getAdminUserIds(): Promise<string[]> {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("users")
    .select("id")
    .eq("is_admin", true);

  if (error || !data) return [];
  return data.map((row) => row.id);
}
