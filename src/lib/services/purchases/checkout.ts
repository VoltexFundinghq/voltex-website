"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/database/users";
import { getChallengeById, nairaToKobo } from "@/lib/config/challenges";
import { createPurchase, updatePurchaseStatus } from "@/lib/database/purchases";
import { createPalmPayOrder } from "@/lib/services/palmpay/client";

export async function createCheckoutForUser(params: {
  userId: string;
  userEmail: string | null;
  fullName: string | null;
  phone: string | null;
  challengeId: string;
}): Promise<string> {
  const challenge = getChallengeById(params.challengeId);
  if (!challenge || challenge.status !== "active" || challenge.challenge_fee === null) {
    throw new Error("This challenge is not currently available for purchase.");
  }

  const orderId = `voltex-${crypto.randomUUID()}`;

  const purchase = await createPurchase({
    userId: params.userId,
    challengeSize: challenge.challenge_name,
    challengeConfigId: params.challengeId,
    pricePaid: challenge.challenge_fee,
    paymentReference: orderId,
  });

  if (!purchase) {
    throw new Error("Could not start your purchase. Please try again.");
  }

  try {
    const order = await createPalmPayOrder({
      orderId,
      amountKobo: nairaToKobo(challenge.challenge_fee),
      notifyUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/palmpay`,
      callBackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/challenges?order=${orderId}`,
      title: challenge.challenge_name,
      description: `Voltex Funding — ${challenge.challenge_name}`,
      customerInfo: {
        userId: params.userId,
        userName: params.fullName ?? params.userEmail ?? "Trader",
        phone: params.phone ?? "",
        email: params.userEmail ?? "",
      },
    });
    return order.checkoutUrl;
  } catch (err) {
    await updatePurchaseStatus(purchase.id, "failed");
    throw new Error("Could not connect to the payment provider. Please try again.");
  }
}

export async function initiateChallengeCheckout(challengeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signup?challenge=${challengeId}`);
  }

  const profile = await getProfile();

  const checkoutUrl = await createCheckoutForUser({
    userId: user.id,
    userEmail: user.email ?? null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    challengeId,
  });

  redirect(checkoutUrl);
}
