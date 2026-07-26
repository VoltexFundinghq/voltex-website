import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { sendChallengeCredentialsEmail } from "@/lib/services/email/templates";

const PRICE_TO_ACCOUNT_SIZE: Record<number, number> = {
  8900: 200000,
  13900: 300000,
  22900: 500000,
  27900: 700000,
  34900: 800000,
};

function buildSignString(params: Record<string, any>): string {
  const keys = Object.keys(params).filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== "").sort();
  return keys.map((k) => `${k}=${String(params[k]).trim()}`).join("&");
}

function md5Uppercase(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("hex").toUpperCase();
}

async function queryPalmPay(orderId: string) {
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(process.env.PALMPAY_PRIVATE_KEY as string, "base64"),
    format: "der",
    type: "pkcs8",
  });

  const body = {
    requestTime: Date.now(),
    version: "V2.0",
    nonceStr: crypto.randomBytes(16).toString("hex"),
    orderId,
  };
  const strA = buildSignString(body);
  const md5Str = md5Uppercase(strA);
  const signer = crypto.createSign("RSA-SHA1");
  signer.update(md5Str, "utf8");
  const signature = signer.sign(privateKey, "base64");

  const response = await fetch("https://open-gw-sandbox.palmpay-inc.com/api/v2/payment/merchant/order/queryStatus", {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      CountryCode: "NG",
      Authorization: `Bearer ${process.env.PALMPAY_APP_ID}`,
      Signature: signature,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const purchaseQuery = await serviceClient.from("challenge_purchases").select("*").eq("id", id).single();
  const purchase = purchaseQuery.data as any;
  if (purchaseQuery.error || !purchase) {
    return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  }

  if (!purchase.payment_reference) {
    return NextResponse.json({ error: "No payment reference on this purchase — cannot verify" }, { status: 400 });
  }

  const result = await queryPalmPay(purchase.payment_reference);

  if (result.respCode !== "00000000") {
    return NextResponse.json({ error: `PalmPay query failed: ${result.respMsg}` }, { status: 502 });
  }

  if (result.data.orderStatus !== 2) {
    return NextResponse.json({ status: "still_pending", message: `PalmPay shows this order as not yet completed (status ${result.data.orderStatus}).` });
  }

  const { data: updatedRows, error: updateError } = await (serviceClient.from("challenge_purchases") as any)
    .update({ payment_status: "completed" })
    .eq("id", purchase.id)
    .neq("payment_status", "completed")
    .select();

  if (updateError || !updatedRows || updatedRows.length === 0) {
    return NextResponse.json({ status: "already_completed", message: "This purchase was already marked completed." });
  }

  const userQuery = await serviceClient.from("users").select("email").eq("id", purchase.user_id).single();
  const userRow = userQuery.data as { email: string } | null;

  await serviceClient.from("notifications").insert({
    user_id: purchase.user_id,
    title: "Payment Received",
    message: `We've received your payment of ₦${Number(purchase.price_paid).toLocaleString()} for the ${purchase.challenge_size}.`,
    is_read: false,
  } as any);

  if (!purchase.challenge_config_id) {
    return NextResponse.json({ status: "completed_no_provision", message: "Marked completed, but no challenge_config_id — cannot auto-provision." });
  }

  const accountSize = PRICE_TO_ACCOUNT_SIZE[Number(purchase.price_paid)];
  if (!accountSize) {
    return NextResponse.json({ status: "completed_no_provision", message: "Marked completed, but could not map price to a known account size." });
  }

  const { data: userChallenge, error: createError } = await (serviceClient.from("user_challenges") as any)
    .insert({
      user_id: purchase.user_id,
      challenge_id: purchase.challenge_config_id,
      status: "awaiting_allocation",
      profit_target: 10.0,
      drawdown_limit: 20.0,
      profit_split: 80.0,
    })
    .select()
    .single();

  if (createError || !userChallenge) {
    return NextResponse.json({ status: "completed_no_provision", message: "Marked completed, but failed to create challenge record." });
  }

  const { data: allocation, error: allocError } = await (serviceClient.rpc as any)("allocate_trading_account", {
    p_user_challenge_id: userChallenge.id,
    p_account_size: accountSize,
  });

  if (allocError || !allocation || allocation.length === 0) {
    return NextResponse.json({ status: "completed_awaiting_allocation", message: "Marked completed and challenge created — no inventory available right now." });
  }

  if (userRow?.email) {
    await sendChallengeCredentialsEmail(userRow.email, {
      challengeName: purchase.challenge_size,
      login: allocation[0].login,
      password: allocation[0].password,
      server: allocation[0].server,
      broker: allocation[0].broker,
    });
  }

  return NextResponse.json({ status: "completed_and_provisioned", message: `Verified, provisioned account ${allocation[0].login}, and emailed credentials.` });
}
