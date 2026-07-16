/**
 * Paystack payment integration — PHASE 2, NOT YET IMPLEMENTED.
 * This file defines the contract Phase 2 will implement: initializing a
 * challenge purchase payment and verifying it via Paystack's webhook.
 */

export interface InitializePaymentParams {
  email: string;
  amountKobo: number; // Paystack expects amounts in kobo, not naira
  challengeSize: string;
  userId: string;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  reference: string;
  amountKobo: number;
}

export async function initializePayment(
  _params: InitializePaymentParams
): Promise<InitializePaymentResult> {
  throw new Error("initializePayment is not implemented yet — Phase 2 (Paystack Integration).");
}

export async function verifyPayment(_reference: string): Promise<VerifyPaymentResult> {
  throw new Error("verifyPayment is not implemented yet — Phase 2 (Paystack Integration).");
}
