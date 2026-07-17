import { createClient } from "@/lib/supabase/server";
import type { TradingAccount } from "@/lib/types/database";

/**
 * Fetches all trading accounts assigned to the currently logged-in user.
 */
export async function getMyTradingAccounts(): Promise<TradingAccount[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("trading_accounts")
    .select("*")
    .eq("assigned_to", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}
