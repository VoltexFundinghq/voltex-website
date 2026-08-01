import { sendEmail } from "./client";

const LOGO_URL = "https://voltex-website-eta.vercel.app/logo.png";

function wrapper(bodyHtml: string, cta?: { text: string; url: string }): string {
  const ctaHtml = cta ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
      <tr>
        <td style="border-radius:8px;background:#D4AF37;">
          <a href="${cta.url}" style="display:inline-block;padding:13px 30px;font-size:14px;font-weight:600;color:#000;text-decoration:none;border-radius:8px;">${cta.text}</a>
        </td>
      </tr>
    </table>
  ` : "";

  return `
    <div style="background:#000000;padding:40px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#0d0d0d;border:1px solid rgba(212,175,55,0.25);border-radius:16px;overflow:hidden;">
        <div style="padding:28px 32px 22px;text-align:center;border-bottom:1px solid rgba(212,175,55,0.15);">
          <img src="${LOGO_URL}" alt="Voltex Funding" style="height:42px;width:auto;" />
        </div>
        <div style="padding:32px;">
          ${bodyHtml}
          ${ctaHtml}
        </div>
        <div style="padding:18px 32px;border-top:1px solid rgba(212,175,55,0.1);text-align:center;">
          <p style="margin:0;font-size:11px;color:#666;letter-spacing:0.3px;">Voltex Funding — Built for disciplined Nigerian traders.</p>
        </div>
      </div>
    </div>
  `;
}

function credentialsTable(rows: { label: string; value: string }[]): string {
  const rowsHtml = rows.map((r, i) => `
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#888;${i > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : ""}">${r.label}</td>
      <td style="padding:12px 16px;font-size:14px;color:#fff;font-weight:600;text-align:right;font-family:monospace;${i > 0 ? "border-top:1px solid rgba(255,255,255,0.06);" : ""}">${r.value}</td>
    </tr>
  `).join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:18px;background:rgba(212,175,55,0.04);border:1px solid rgba(212,175,55,0.15);border-radius:10px;overflow:hidden;">
      ${rowsHtml}
    </table>
  `;
}

export async function sendWelcomeEmail(to: string, fullName: string) {
  const html = wrapper(`
    <h2 style="margin:0 0 14px;font-size:20px;color:#fff;">Welcome to Voltex Funding, ${fullName}! 🎉</h2>
    <p style="color:#ccc;line-height:1.7;margin:0 0 12px;">We're genuinely glad to have you here. You've just taken the first step toward trading with real capital, backed by a firm that believes in disciplined, consistent traders like you.</p>
    <p style="color:#ccc;line-height:1.7;margin:0;">Whenever you're ready, explore our challenge programs and find the one that fits how you trade. We'll be right here cheering you on.</p>
  `, { text: "Explore Challenges", url: "https://voltex-website-eta.vercel.app/challenges" });
  return sendEmail({ to, subject: "Welcome to Voltex Funding 🎉", html });
}

export async function sendChallengePurchasedEmail(to: string, params: { challengeName: string; amount: number }) {
  const html = wrapper(`
    <h2 style="margin:0 0 14px;font-size:20px;color:#fff;">Purchase Confirmed ✅</h2>
    <p style="color:#ccc;line-height:1.7;margin:0 0 12px;">We've received your payment of <strong style="color:#D4AF37;">₦${params.amount.toLocaleString()}</strong> for the <strong style="color:#fff;">${params.challengeName}</strong>. Nice choice — this is where the real journey begins.</p>
    <p style="color:#ccc;line-height:1.7;margin:0;">Your trading account is being prepared right now. You'll receive your login details shortly — usually within moments.</p>
  `);
  return sendEmail({ to, subject: `Purchase Confirmed — ${params.challengeName}`, html });
}

export async function sendChallengeCredentialsEmail(to: string, params: {
  challengeName: string;
  login: string;
  password: string;
  server: string;
  broker: string;
}) {
  const html = wrapper(`
    <h2 style="margin:0 0 14px;font-size:20px;color:#fff;">Your Trading Account Is Ready 🚀</h2>
    <p style="color:#ccc;line-height:1.7;margin:0 0 6px;">This is it — your <strong style="color:#fff;">${params.challengeName}</strong> account is live and waiting for you. Here are your MT5 login details:</p>
    ${credentialsTable([
      { label: "Login", value: params.login },
      { label: "Password", value: params.password },
      { label: "Server", value: params.server },
      { label: "Broker", value: params.broker },
    ])}
    <p style="color:#ccc;line-height:1.7;margin:20px 0 0;">Download MT5, log in with the details above, and start trading with discipline. We're rooting for you.</p>
  `);
  return sendEmail({ to, subject: "Your Voltex Funding MT5 Account Details 🚀", html });
}

// Title/message are set individually at each of the ~15 real call
// sites across the live rule engine (Phase 1 Passed, Drawdown
// Warning, Challenge Failed, etc.) — intentionally left untouched
// here, since rewriting that copy means editing the live rule engine
// itself, worth its own separate, careful pass rather than bundling
// into a styling update.
export async function sendRuleEngineAlertEmail(to: string, params: { title: string; message: string }) {
  const html = wrapper(`
    <h2 style="margin:0 0 14px;font-size:20px;color:#fff;">${params.title}</h2>
    <p style="color:#ccc;line-height:1.7;margin:0;">${params.message}</p>
  `, { text: "View My Account", url: "https://voltex-website-eta.vercel.app/login" });
  return sendEmail({ to, subject: params.title, html });
}

/**
 * Sent the moment a trader passes Phase 2 and a genuinely NEW funded
 * account has been allocated — a real, different login from the
 * evaluation account, per the "evaluation to funded = new account"
 * business rule.
 */
export async function sendFundedAccountEmail(to: string, params: {
  accountSize: string;
  login: string;
  password: string;
  server: string;
  broker: string;
}) {
  const html = wrapper(`
    <h2 style="margin:0 0 14px;font-size:20px;color:#fff;">Welcome to Funded Stage! 🏆</h2>
    <p style="color:#ccc;line-height:1.7;margin:0 0 6px;">Congratulations — genuinely. You did the hard part: you proved you can trade with discipline, two phases in a row. Here are your new funded <strong style="color:#D4AF37;">${params.accountSize}</strong> account details:</p>
    ${credentialsTable([
      { label: "Login", value: params.login },
      { label: "Password", value: params.password },
      { label: "Server", value: params.server },
      { label: "Broker", value: params.broker },
    ])}
    <p style="color:#ccc;line-height:1.7;margin:20px 0 0;">This account is yours to keep, across every future payout cycle. Keep trading exactly the way that got you here — good luck out there.</p>
  `);
  return sendEmail({ to, subject: "Welcome to Funded Stage — Voltex Funding 🏆", html });
}
