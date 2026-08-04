import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { rejectPayoutRequest } from "@/lib/services/payouts/actions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = body.reason ?? undefined;

  const serviceClient = createServiceClient();
  const challengeQuery = await serviceClient.from("user_challenges").select("user_id").eq("id", id).single();
  const challenge = challengeQuery.data as { user_id: string } | null;
  if (!challenge) return NextResponse.json({ error: "Trader not found" }, { status: 404 });

  const payoutQuery = await serviceClient.from("payout_requests").select("id").eq("user_id", challenge.user_id).eq("status", "pending").order("requested_at", { ascending: false }).limit(1).single();
  const payout = payoutQuery.data as { id: string } | null;
  if (!payout) return NextResponse.json({ error: "No pending payout request found" }, { status: 404 });

  const result = await rejectPayoutRequest(payout.id, admin.email ?? "unknown admin", reason);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ success: true });
}
