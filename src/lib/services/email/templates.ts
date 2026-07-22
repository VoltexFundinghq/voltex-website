import { sendEmail } from "./client";

function wrapper(bodyHtml: string): string {
  return `
    <div style="background:#0a0a0a;padding:32px 16px;font-family:Arial,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#111;border:1px solid #D4AF3733;border-radius:16px;padding:32px;color:#fff;">
        <p style="color:#D4AF37;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Voltex Funding</p>
        ${bodyHtml}
        <p style="margin-top:32px;font-size:12px;color:#888;">Voltex Funding — Built for disciplined Nigerian traders.</p>
      </div>
    </div>
  `;
}

export async function sendWelcomeEmail(to: string, fullName: string) {
  const html = wrapper(`
    <h2 style="margin:0 0 12px;">Welcome to Voltex Funding, ${fullName}!</h2>
    <p style="color:#ccc;line-height:1.6;">Your account is ready. Browse our challenge programs whenever you're ready to prove your consistency and get funded.</p>
  `);
  return sendEmail({ to, subject: "Welcome to Voltex Funding", html });
}

export async function sendChallengePurchasedEmail(to: string, params: { challengeName: string; amount: number }) {
  const html = wrapper(`
    <h2 style="margin:0 0 12px;">Purchase Confirmed</h2>
    <p style="color:#ccc;line-height:1.6;">We've received your payment of N${params.amount.toLocaleString()} for the ${params.challengeName}. Your trading account is being prepared — you'll receive your login details shortly.</p>
  `);
  return sendEmail({ to, subject: "Your Voltex Funding Challenge Purchase", html });
}

/**
 * Deliberately sends ONLY the master (trading) password to the trader —
 * the investor (read-only) password is reserved for Voltex Funding's
 * own internal monitoring system and is never included here.
 */
export async function sendChallengeCredentialsEmail(to: string, params: {
  challengeName: string;
  login: string;
  password: string;
  server: string;
  broker: string;
}) {
  const html = wrapper(`
    <h2 style="margin:0 0 12px;">Your Trading Account Is Ready</h2>
    <p style="color:#ccc;line-height:1.6;">Your ${params.challengeName} account has been set up. Here are your MT5 details:</p>
    <table style="width:100%;margin-top:16px;font-size:14px;color:#fff;">
      <tr><td style="padding:6px 0;color:#888;">Login</td><td style="padding:6px 0;text-align:right;">${params.login}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Password</td><td style="padding:6px 0;text-align:right;">${params.password}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Server</td><td style="padding:6px 0;text-align:right;">${params.server}</td></tr>
      <tr><td style="padding:6px 0;color:#888;">Broker</td><td style="padding:6px 0;text-align:right;">${params.broker}</td></tr>
    </table>
    <p style="color:#ccc;line-height:1.6;margin-top:20px;">Download MT5 and log in with the details above to begin trading.</p>
  `);
  return sendEmail({ to, subject: "Your Voltex Funding MT5 Account Details", html });
}
