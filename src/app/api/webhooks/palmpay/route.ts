import { NextResponse } from "next/server";
import { verifyCallbackSignature } from "@/lib/services/palmpay/signing";
import { mapPalmPayStatus } from "@/lib/services/palmpay/status-mapping";
import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/database/notifications";

/**
 * PalmPay requires the literal plain-text string "success" in response —
 * not JSON, nothing extra — or it retries the callback up to 6 times.
 */
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

  const { data: purchase, error: lookupError } = await serviceClient
    .from("challenge_purchases")
    .select("*")
    .eq("payment_reference", orderId)
    .single();

  if (lookupError || !purchase) {
    console.error(`PalmPay webhook: no purchase found for orderId ${orderId}`);
    return new NextResponse("success", { status: 200 });
  }

  const newStatus = mapPalmPayStatus(orderStatus);

  if (newStatus === purchase.payment_status) {
    return new NextResponse("success", { status: 200 });
  }

  /**
   * Atomic, race-condition-safe update: only succeeds if this row isn't
   * already "completed". If two webhook deliveries for the same order
   * arrive almost simultaneously, only one actually performs this update —
   * the other gets zero affected rows back and safely no-ops, instead of
   * both processing the same payment twice.
   */
  const { data: updatedRows, error: updateError } = await serviceClient
    .from("challenge_purchases")
    .update({ payment_status: newStatus })
    .eq("id", purchase.id)
    .neq("payment_status", "completed")
    .select();

  if (updateError) {
    console.error("PalmPay webhook: failed to update purchase status", updateError);
    return new NextResponse("success", { status: 200 });
  }

  const didUpdate = updatedRows && updatedRows.length > 0;

  // Only the request that actually performed the transition sends
  // notifications — prevents duplicates under a race.
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
  }

  return new NextResponse("success", { status: 200 });
}
