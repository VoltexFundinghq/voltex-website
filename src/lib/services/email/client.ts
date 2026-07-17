import { Resend } from "resend";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends via Resend if RESEND_API_KEY is set; otherwise logs the full
 * payload to the console. Calling code never needs to change — only
 * this function's internals, once the real key is added.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; simulated: boolean }> {
  const resend = getResendClient();

  if (!resend) {
    console.log("=== EMAIL (RESEND_API_KEY not set — logging instead of sending) ===");
    console.log("To:", params.to);
    console.log("Subject:", params.subject);
    console.log(params.html);
    console.log("=====================================================================");
    return { success: true, simulated: true };
  }

  const { error } = await resend.emails.send({
    from: "Voltex Funding <support@voltexfunding.com>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if (error) {
    console.error("Resend send failed:", error);
    return { success: false, simulated: false };
  }

  return { success: true, simulated: false };
}
