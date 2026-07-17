import crypto from "crypto";

function buildSignString(params: Record<string, unknown>): string {
  const sortedKeys = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort();

  return sortedKeys.map((key) => `${key}=${String(params[key]).trim()}`).join("&");
}

function md5Uppercase(input: string): string {
  return crypto.createHash("md5").update(input, "utf8").digest("hex").toUpperCase();
}

function loadPrivateKey(base64Der: string): crypto.KeyObject {
  return crypto.createPrivateKey({
    key: Buffer.from(base64Der, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

function loadPublicKey(base64Der: string): crypto.KeyObject {
  return crypto.createPublicKey({
    key: Buffer.from(base64Der, "base64"),
    format: "der",
    type: "spki",
  });
}

export function signRequest(params: Record<string, unknown>, privateKeyBase64: string): string {
  const strA = buildSignString(params);
  const md5Str = md5Uppercase(strA);
  const privateKey = loadPrivateKey(privateKeyBase64);
  const signer = crypto.createSign("RSA-SHA1");
  signer.update(md5Str, "utf8");
  return signer.sign(privateKey, "base64");
}

/**
 * Verifies a PalmPay webhook callback signature using PalmPay's public key.
 * IMPORTANT: PalmPay sends the "sign" field URL-encoded (e.g. %2F for '/',
 * %2B for '+', %3D for '='). It must be decoded back to raw base64 before
 * verification, or every real signature will fail to validate.
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
  const decodedSign = decodeURIComponent(sign);
  return verifier.verify(publicKey, decodedSign, "base64");
}
