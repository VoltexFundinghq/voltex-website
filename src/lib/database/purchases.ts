import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ChallengePurchase, PaymentStatus } from "@/lib/types/database";

/**
 * Fetches all challenge purchases belonging to the currently logged-in
 * user, most recent first. RLS ensures this can never leak another
 * user's purchases, regardless of what's passed in.
 */
export async function getPurchases(): Promise<ChallengePurchase[]> {
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

/**
 * Fetches a single purchase by its id, scoped to the current user via RLS.
 */
export async function getPurchaseById(purchaseId: string): Promise<ChallengePurchase | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenge_purchases")
    .select("*")
    .eq("id", purchaseId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Creates a new purchase record, always starting as "pending" — the
 * moment a user begins checkout, before we know whether they'll
 * actually complete payment. Gives every checkout attempt a traceable
 * record, even abandoned ones.
 */
export async function createPurchase(params: {
  userId: string;
  challengeSize: string;
  pricePaid: number;
  paymentReference: string;
}): Promise<ChallengePurchase | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("challenge_purchases")
    .insert({
      user_id: params.userId,
      challenge_size: params.challengeSize,
      price_paid: params.pricePaid,
      payment_reference: params.paymentReference,
      payment_status: "pending",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("createPurchase failed:", error);
    return null;
  }
  return data;
}

/**
 * Looks up a purchase by PalmPay's orderId (our payment_reference).
 * Uses the SERVICE ROLE client since this runs from the webhook,
 * where there's no logged-in user for RLS to scope against.
 */
export async function getPurchaseByReference(paymentReference: string): Promise<ChallengePurchase | null> {
  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("challenge_purchases")
    .select("*")
    .eq("payment_reference", paymentReference)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Updates a purchase's status via the service role client — used by the
 * webhook once PalmPay confirms the real outcome of a payment.
 */
export async function updatePurchaseStatus(purchaseId: string, status: PaymentStatus): Promise<boolean> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("challenge_purchases")
    .update({ payment_status: status })
    .eq("id", purchaseId);

  return !error;
}
