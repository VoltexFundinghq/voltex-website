import { NextResponse } from "next/server";
import { createNotification } from "@/lib/database/notifications";
import { getAdminUserIds } from "@/lib/database/admin";
import { sendRuleEngineAlertEmail } from "@/lib/services/email/templates";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Called by the VPS poller itself when it hits an unhandled crash,
 * right before exiting. Lets us know the monitoring system had a real
 * problem, rather than silently restarting with nobody informed.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { slotLabel, errorMessage } = body;

  const serviceClient = createServiceClient();
  const adminIds = await getAdminUserIds();

  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId,
      title: "VPS Poller Crashed",
      message: `Slot "${slotLabel ?? "unknown"}" crashed with error: ${errorMessage ?? "no details provided"}. The supervisor should restart it automatically, but this is worth checking.`,
    });

    const userQuery = await serviceClient.from("users").select("email").eq("id", adminId).single();
    const userRow = userQuery.data as { email: string } | null;
    if (userRow?.email) {
      await sendRuleEngineAlertEmail(userRow.email, {
        title: "VPS Poller Crashed",
        message: `Slot "${slotLabel ?? "unknown"}" crashed with error: ${errorMessage ?? "no details provided"}. The supervisor should restart it automatically, but this is worth checking.`,
      });
    }
  }

  return NextResponse.json({ status: "ok" });
}
