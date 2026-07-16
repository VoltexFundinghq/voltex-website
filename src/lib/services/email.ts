/**
 * Custom transactional emails — PHASE 2, NOT YET IMPLEMENTED.
 * Note: auth emails (signup confirmation, password reset) are already
 * live via Supabase's built-in email hooks + Resend SMTP — see Step 2.
 * This file is for everything else: payout confirmations, KYC status
 * updates, funded-account congratulations, admin alerts, etc. — sent
 * directly through Resend's API rather than through Supabase Auth.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  templateId: string;
  data: Record<string, string | number>;
}

export async function sendTransactionalEmail(_params: SendEmailParams): Promise<void> {
  throw new Error("sendTransactionalEmail is not implemented yet — Phase 2 (Email Notifications).");
}
