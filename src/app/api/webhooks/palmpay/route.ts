import { NextResponse } from "next/server";
import { verifyCallbackSignature } from "@/lib/services/palmpay/signing";
import { mapPalmPayStatus } from "@/lib/services/palmpay/status-mapping";
import { createServiceClient } from "@/lib/supabase/service";

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

  // Idempotency: stops PalmPay's retries (or a duplicate delivery) from
  // double-processing the same payment.
  if (purchase.payment_status === "completed") {
    return new NextResponse("success", { status: 200 });
  }

  const newStatus = mapPalmPayStatus(orderStatus);

  if (newStatus !== purchase.payment_status) {
    const { error: updateError } = await serviceClient
      .from("challenge_purchases")
      .update({ payment_status: newStatus })
      .eq("id", purchase.id);

    if (updateError) {
      console.error("PalmPay webhook: failed to update purchase status", updateError);
    }
  }

  return new NextResponse("success", { status: 200 });
}
