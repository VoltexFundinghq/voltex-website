import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ChallengePurchase, PaymentStatus } from "@/lib/types/database";

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

export async function createPurchase(params: {
  userId: string;
  challengeSize: string;
  challengeConfigId: string;
  pricePaid: number;
  paymentReference: string;
}): Promise<ChallengePurchase | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("challenge_purchases")
    .insert({
      user_id: params.userId,
      challenge_size: params.challengeSize,
      challenge_config_id: params.challengeConfigId,
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

export async function updatePurchaseStatus(purchaseId: string, status: PaymentStatus): Promise<boolean> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("challenge_purchases")
    .update({ payment_status: status })
    .eq("id", purchaseId);

  return !error;
}
