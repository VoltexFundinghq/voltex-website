import { NextResponse } from "next/server";
import { verifyCallbackSignature } from "@/lib/services/palmpay/signing";

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

  // TODO (Step 5/7): look up the purchase by orderId, mark it completed
  // idempotently — check current status first so PalmPay's retries can't
  // double-process the same payment.

  return new NextResponse("success", { status: 200 });
}
