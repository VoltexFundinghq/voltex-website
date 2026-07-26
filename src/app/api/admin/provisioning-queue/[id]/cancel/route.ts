import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

// Safe to cancel a WAITING request specifically: complete_user_challenge
// checks for a linked trading_account_id before touching inventory,
// and a waiting request has none — so this only ever updates the
// challenge's own status, never touches trading_accounts at all.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("id").eq("id", id).eq("status", "awaiting_allocation").single();
  if (!challengeQuery.data) return NextResponse.json({ error: "Not found or already allocated" }, { status: 404 });

  const { error } = await (serviceClient.rpc as any)("complete_user_challenge", { p_user_challenge_id: id, p_outcome: "failed" });
  if (error) return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });

  return NextResponse.json({ success: true });
}
