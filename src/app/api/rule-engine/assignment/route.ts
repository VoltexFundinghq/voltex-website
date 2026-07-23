import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Called periodically by a VPS poller (much less often than the
 * 15-second balance/equity check) to ask: "which account should this
 * specific terminal slot currently be watching?" Handles automatically
 * reassigning a slot once its previous challenge ends.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slotLabel = searchParams.get("slot");

  if (!slotLabel) {
    return NextResponse.json({ error: "Missing slot parameter" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await (serviceClient.rpc as any)("get_or_assign_slot_watch", {
    p_slot_label: slotLabel,
  });

  if (error) {
    console.error("assignment RPC failed:", error);
    return NextResponse.json({ error: "assignment lookup failed" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ status: "no_assignment" });
  }

  const assignment = data[0];
  return NextResponse.json({
    status: "assigned",
    userChallengeId: assignment.user_challenge_id,
    login: assignment.login,
    investorPassword: assignment.investor_password,
    server: assignment.server,
    broker: assignment.broker,
  });
}
