import { createClient } from "@/lib/supabase/server";
import type { ChallengePurchase } from "@/lib/types/database";

/**
 * Fetches all challenge purchases for the currently logged-in user,
 * most recent first.
 */
export async function getMyChallengePurchases(): Promise<ChallengePurchase[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("challenge_purchases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}
