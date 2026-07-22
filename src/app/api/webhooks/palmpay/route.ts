import { NextResponse } from "next/server";
import { verifyCallbackSignature } from "@/lib/services/palmpay/signing";
import { mapPalmPayStatus } from "@/lib/services/palmpay/status-mapping";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/database/notifications";
import { provisionChallengeAccount } from "@/lib/services/provisioning/allocate";
import type { ChallengePurchase } from "@/lib/types/database";

export async function POST(request: Request) {
  const body = await request.json();
  const { sign, ...rest } = body;

  const publicKey = process.env.PALMPAY_PUBLIC_KEY!;
  const isValid = verifyCallbackSignature(rest, sign, publicKey);

  if (!isValid) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  const orderId = body.orderId as string | undefined;
  const orderStatus = body.orderStatus as number | undefined;

  if (!orderId || orderStatus === undefined) {
    console.error("PalmPay webhook: missing orderId/orderStatus");
    return new NextResponse("success", { status: 200 });
  }

  const serviceClient = createServiceClient();

  const purchaseQuery = await serviceClient
    .from("challenge_purchases")
    .select("*")
    .eq("payment_reference", orderId)
    .single();

  const purchase = purchaseQuery.data as ChallengePurchase | null;
  const lookupError = purchaseQuery.error;

  if (lookupError || !purchase) {
    console.error(`PalmPay webhook: no purchase found for orderId ${orderId}`);
    return new NextResponse("success", { status: 200 });
  }

  const newStatus = mapPalmPayStatus(orderStatus);

  if (newStatus === purchase.payment_status) {
    return new NextResponse("success", { status: 200 });
  }

  const { data: updatedRows, error: updateError } = await (serviceClient
    .from("challenge_purchases") as any)
    .update({ payment_status: newStatus })
    .eq("id", purchase.id)
    .neq("payment_status", "completed")
    .select();

  if (updateError) {
    console.error("PalmPay webhook: failed to update purchase status", updateError);
    return new NextResponse("success", { status: 200 });
  }

  const didUpdate = updatedRows && updatedRows.length > 0;

  if (didUpdate && newStatus === "completed") {
    await createNotification({
      userId: purchase.user_id,
      title: "Payment Received",
      message: `We've received your payment of N${purchase.price_paid.toLocaleString()} for the ${purchase.challenge_size}.`,
    });
    await createNotification({
      userId: purchase.user_id,
      title: "Purchase Confirmed",
      message: `Your ${purchase.challenge_size} purchase is confirmed. Your challenge account will be set up shortly.`,
    });

    if (purchase.challenge_config_id) {
      const userQuery = await serviceClient
        .from("users")
        .select("email")
        .eq("id", purchase.user_id)
        .single();

      const userRow = userQuery.data as { email: string } | null;

      try {
        await provisionChallengeAccount({
          userId: purchase.user_id,
          userEmail: userRow?.email ?? "",
          challengeConfigId: purchase.challenge_config_id,
        });
      } catch (err) {
        console.error("PalmPay webhook: provisioning failed", err);
      }
    } else {
      console.warn(`PalmPay webhook: purchase ${purchase.id} has no challenge_config_id — skipping provisioning`);
    }
  }

  return new NextResponse("success", { status: 200 });
}
