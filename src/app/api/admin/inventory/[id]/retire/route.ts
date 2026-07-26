import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("id").eq("trading_account_id", id).eq("status", "active").maybeSingle();
  const challenge = challengeQuery.data as { id: string } | null;

  if (challenge) {
    const { error } = await (serviceClient.rpc as any)("complete_user_challenge", { p_user_challenge_id: challenge.id, p_outcome: "failed" });
    if (error) return NextResponse.json({ error: "Failed to retire account" }, { status: 500 });
  } else {
    const { error } = await (serviceClient.from("trading_accounts") as any).update({ status: "resetting" }).eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to retire account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
