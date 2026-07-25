import { createServiceClient } from "@/lib/supabase/service";

export interface DashboardKPIs {
  activeTraders: number;
  totalRevenue: number;
  pendingProvisioning: number;
  availableInventory: number;
  passedChallenges: number;
  failedChallenges: number;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const serviceClient = createServiceClient();

  const [active, revenue, pending, available, passed, failed] = await Promise.all([
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "active"),
    serviceClient.from("challenge_purchases").select("price_paid").eq("payment_status", "completed"),
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "awaiting_allocation"),
    serviceClient.from("trading_accounts").select("id", { count: "exact", head: true }).eq("status", "available"),
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "passed"),
    serviceClient.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ]);

  const revenueRows = revenue.data as { price_paid: number }[] | null;
  const totalRevenue = (revenueRows ?? []).reduce((sum, r) => sum + Number(r.price_paid), 0);

  return {
    activeTraders: active.count ?? 0,
    totalRevenue,
    pendingProvisioning: pending.count ?? 0,
    availableInventory: available.count ?? 0,
    passedChallenges: passed.count ?? 0,
    failedChallenges: failed.count ?? 0,
  };
}
