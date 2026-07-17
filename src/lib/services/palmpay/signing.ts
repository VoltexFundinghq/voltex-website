import crypto from "crypto";

/**
 * PalmPay's exact signing algorithm, confirmed from their official docs:
 * 1. Sort all non-empty parameters alphabetically by key, concatenate as
 *    key1=value1&key2=value2...
 * 2. MD5 hash that string, uppercase the result
 * 3. Sign the uppercased MD5 string with the merchant's RSA private key
 *    using SHA1withRSA — that becomes the Signature header value
 *
 * PalmPay's dashboard provides keys as raw base64 DER (PKCS8 for private,
 * SPKI for public), NOT PEM. We build proper KeyObjects from that raw
 * base64 rather than assuming PEM headers exist.
 */

function buildSignString(params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort();

  return sortedKeys.map((key) => `${key}=${String(params[key]).trim()}`).join("&");
}

function md5Uppercase(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("hex").toUpperCase();
}

/** Builds a usable private key object from PalmPay's raw base64 PKCS8 string. */
function loadPrivateKey(base64Der: string): crypto.KeyObject {
  return crypto.createPrivateKey({
    key: Buffer.from(base64Der, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

/** Builds a usable public key object from PalmPay's raw base64 SPKI string. */
function loadPublicKey(base64Der: string): crypto.KeyObject {
  return crypto.createPublicKey({
    key: Buffer.from(base64Der, "base64"),
    format: "der",
    type: "spki",
  });
}

/** Signs a request body. privateKeyBase64 is the raw base64 string from PalmPay's dashboard. */
export function signRequest(params: Record<string, unknown>, privateKeyBase64: string): string {
  const strA = buildSignString(params);
  const md5Str = md5Uppercase(strA);
  const privateKey = loadPrivateKey(privateKeyBase64);
  const signer = crypto.createSign("RSA-SHA1");
  signer.update(md5Str, "utf8");
  return signer.sign(privateKey, "base64");
}

/**
 * Verifies a PalmPay webhook callback signature using PALMPAY'S public key
 * (the one labeled "PalmPay Public Key used on test env" — a different key
 * from our own merchant public key). Must be a full-field signature.
 */
export function verifyCallbackSignature(
  params: Record<string, unknown>,
  sign: string,
  palmpayPublicKeyBase64: string
): boolean {
  const strA = buildSignString(params);
  const md5Str = md5Uppercase(strA);
  const publicKey = loadPublicKey(palmpayPublicKeyBase64);
  const verifier = crypto.createVerify("RSA-SHA1");
  verifier.update(md5Str, "utf8");
  return verifier.verify(publicKey, sign, "base64");
}
