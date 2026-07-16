import { createClient } from "@/lib/supabase/server";
import type { PayoutRequest } from "@/lib/types/database";

/**
 * Fetches all payout requests made by the currently logged-in user.
 */
export async function getMyPayoutRequests(): Promise<PayoutRequest[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("requested_at", { ascending: false });

  if (error || !data) return [];
  return data;
}
