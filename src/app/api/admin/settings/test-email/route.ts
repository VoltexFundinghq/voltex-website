import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { sendRuleEngineAlertEmail } from "@/lib/services/email/templates";

export async function POST(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await sendRuleEngineAlertEmail(admin.email!, {
      title: "Test Email — Voltex Funding Settings",
      message: `This is a real test email sent from the Settings page at ${new Date().toLocaleString()}, confirming Resend delivery is working.`,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
