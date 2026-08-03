"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { UAParser } from "ua-parser-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getProfile } from "@/lib/database/users";
import { getChallengeById, nairaToKobo } from "@/lib/config/challenges";
import { createPurchase, updatePurchaseStatus } from "@/lib/database/purchases";
import { createPalmPayOrder } from "@/lib/services/palmpay/client";

async function recordTermsAcceptance(userId: string, challengeConfigId: string, purchaseReference: string) {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : headerList.get("x-real-ip");
    const userAgent = headerList.get("user-agent");

    let deviceSummary: string | null = null;
    if (userAgent) {
      const parser = new UAParser(userAgent);
      const browser = parser.getBrowser();
      const os = parser.getOS();
      const browserPart = browser.name ? `${browser.name} ${browser.version ?? ""}`.trim() : "Unknown browser";
      const osPart = os.name ? `${os.name} ${os.version ?? ""}`.trim() : "Unknown OS";
      deviceSummary = `${browserPart} on ${osPart}`;
    }

    const serviceClient = createServiceClient();
    await (serviceClient.from("terms_acceptances") as any).insert({
      user_id: userId,
      challenge_config_id: challengeConfigId,
      ip_address: ipAddress ?? null,
      user_agent: userAgent ?? null,
      device_summary: deviceSummary,
      purchase_reference: purchaseReference,
    });
  } catch (err) {
    // A missing consent record is a real problem worth logging loudly
    // — unlike signup metadata, this one matters for dispute evidence
    // — but must never block a real, already-agreed-to purchase.
    console.error("Failed to record terms acceptance (non-fatal, purchase continues):", err);
  }
}

export async function createCheckoutForUser(params: {
  userId: string;
  userEmail: string | null;
  fullName: string | null;
  phone: string | null;
  challengeId: string;
  agreedToTerms: boolean;
}): Promise<string> {
  if (!params.agreedToTerms) {
    throw new Error("You must agree to the Terms of Service before purchasing.");
  }

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

  await recordTermsAcceptance(params.userId, params.challengeId, orderId);

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

export async function initiateChallengeCheckout(challengeId: string, formData: FormData) {
  const agreedToTerms = formData.get("agreedToTerms") === "on";
  if (!agreedToTerms) {
    redirect(`/challenges?consent=required`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Anonymous visitor — real consent for this path still needs to
    // be captured during signup/OTP itself, since we don't yet know
    // who they are at this exact moment. Not yet wired: needs the
    // signup and OTP-verification screens to add their own real,
    // required checkbox at the point identity becomes trustworthy.
    redirect(`/signup?challenge=${challengeId}`);
  }

  const profile = await getProfile();

  const checkoutUrl = await createCheckoutForUser({
    userId: user.id,
    userEmail: user.email ?? null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    challengeId,
    agreedToTerms: true,
  });

  redirect(checkoutUrl);
}
