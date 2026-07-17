import { signRequest } from "./signing";
import crypto from "crypto";

const PALMPAY_BASE_URL =
  process.env.PALMPAY_ENV === "production"
    ? "https://open-gw-prod.palmpay-inc.com"
    : "https://open-gw-sandbox.palmpay-inc.com";

function generateNonceStr(): string {
  return crypto.randomBytes(16).toString("hex");
}

// ---------- Create Order ----------

export interface CreatePalmPayOrderParams {
  orderId: string;
  amountKobo: number; // PalmPay calls this "cent": 100 = ₦1
  notifyUrl: string;
  callBackUrl: string;
  title: string;
  description?: string;
  customerInfo?: { userId: string; userName: string; phone: string; email: string };
}

export interface CreatePalmPayOrderResult {
  orderNo: string;
  orderStatus: number;
  checkoutUrl: string;
  payToken: string;
}

export async function createPalmPayOrder(
  params: CreatePalmPayOrderParams
): Promise<CreatePalmPayOrderResult> {
  const appId = process.env.PALMPAY_APP_ID!;
  const privateKey = process.env.PALMPAY_PRIVATE_KEY!;

  const body: Record<string, unknown> = {
    requestTime: Date.now(),
    version: "V2.0",
    nonceStr: generateNonceStr(),
    orderId: params.orderId,
    amount: params.amountKobo,
    currency: "NGN",
    notifyUrl: params.notifyUrl,
    callBackUrl: params.callBackUrl,
    title: params.title,
    description: params.description ?? params.title,
    ...(params.customerInfo ? { customerInfo: JSON.stringify(params.customerInfo) } : {}),
  };

  const signature = signRequest(body, privateKey);

  const response = await fetch(`${PALMPAY_BASE_URL}/api/v2/payment/merchant/createorder`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      CountryCode: "NG",
      Authorization: `Bearer ${appId}`,
      Signature: signature,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (json.respCode !== "00000000") {
    throw new Error(`PalmPay createOrder failed: ${json.respMsg ?? "unknown error"}`);
  }

  return {
    orderNo: json.data.orderNo,
    orderStatus: json.data.orderStatus,
    checkoutUrl: json.data.checkoutUrl,
    payToken: json.data.payToken,
  };
}

// ---------- Query Order ----------

export interface QueryPalmPayOrderParams {
  orderId?: string;
  orderNo?: string;
}

export interface QueryPalmPayOrderResult {
  orderId: string;
  orderNo: string;
  amount: number;
  currency: string;
  orderStatus: number;
  payMethod: string | null;
  productType: string | null;
  createdTime: number;
  completedTime: number | null;
}

/**
 * Checks the real, current status of an order directly from PalmPay —
 * an independent source of truth alongside (not instead of) the webhook.
 * Requires either orderId or orderNo; PalmPay accepts whichever you send.
 */
export async function queryPalmPayOrder(
  params: QueryPalmPayOrderParams
): Promise<QueryPalmPayOrderResult> {
  const appId = process.env.PALMPAY_APP_ID!;
  const privateKey = process.env.PALMPAY_PRIVATE_KEY!;

  const body: Record<string, unknown> = {
    requestTime: Date.now(),
    version: "V2.0",
    nonceStr: generateNonceStr(),
    ...(params.orderId ? { orderId: params.orderId } : {}),
    ...(params.orderNo ? { orderNo: params.orderNo } : {}),
  };

  const signature = signRequest(body, privateKey);

  const response = await fetch(`${PALMPAY_BASE_URL}/api/v2/payment/merchant/order/queryStatus`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      CountryCode: "NG",
      Authorization: `Bearer ${appId}`,
      Signature: signature,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (json.respCode !== "00000000") {
    throw new Error(`PalmPay queryOrder failed: ${json.respMsg ?? "unknown error"}`);
  }

  return {
    orderId: json.data.orderId,
    orderNo: json.data.orderNo,
    amount: json.data.amount,
    currency: json.data.currency,
    orderStatus: json.data.orderStatus,
    payMethod: json.data.payMethod ?? null,
    productType: json.data.productType ?? null,
    createdTime: json.data.createdTime,
    completedTime: json.data.completedTime ?? null,
  };
}
