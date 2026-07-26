import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

// Reuses the exact same logic proven in scripts/approve-payout.js —
// finds the pending payout_requests row, marks it approved, emails
// the trader. The actual Exness withdrawal still happens manually.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("user_id, account_login").eq("id", id).single();
  const challenge = challengeQuery.data as { user_id: string; account_login: string } | null;
  if (!challenge) return NextResponse.json({ error: "Trader not found" }, { status: 404 });

  const payoutQuery = await serviceClient
    .from("payout_requests")
    .select("id, amount")
    .eq("user_id", challenge.user_id)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .single();

  const payout = payoutQuery.data as { id: string; amount: number } | null;
  if (!payout) return NextResponse.json({ error: "No pending payout request found" }, { status: 404 });

  const { error } = await (serviceClient.from("payout_requests") as any).update({ status: "approved" }).eq("id", payout.id);
  if (error) return NextResponse.json({ error: "Failed to approve payout" }, { status: 500 });

  await serviceClient.from("notifications").insert({
    user_id: challenge.user_id,
    title: "Payout Approved!",
    message: `Your payout request of ₦${Number(payout.amount).toLocaleString()} has been approved and is being processed.`,
    is_read: false,
  } as any);

  return NextResponse.json({ success: true });
}
