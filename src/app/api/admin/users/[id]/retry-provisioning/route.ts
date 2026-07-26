import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient
    .from("user_challenges")
    .select("id, challenge_id")
    .eq("user_id", id)
    .eq("status", "awaiting_allocation")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const challenge = challengeQuery.data as { id: string; challenge_id: string } | null;
  if (challengeQuery.error || !challenge) {
    return NextResponse.json({ error: "No awaiting-provisioning challenge found for this user" }, { status: 404 });
  }

  // Real account size comes from the challenge config, not guessed —
  // parse it out of the challenge_id convention used elsewhere
  // (e.g. "challenge-500k" -> 500000).
  const sizeMatch = challenge.challenge_id.match(/(\d+)k/);
  const accountSize = sizeMatch ? Number(sizeMatch[1]) * 1000 : null;
  if (!accountSize) {
    return NextResponse.json({ error: "Could not determine account size from challenge config" }, { status: 500 });
  }

  const { data: allocation, error: allocError } = await (serviceClient.rpc as any)("allocate_trading_account", {
    p_user_challenge_id: challenge.id,
    p_account_size: accountSize,
  });

  if (allocError || !allocation || allocation.length === 0) {
    return NextResponse.json({ error: "No available inventory for this size right now" }, { status: 409 });
  }

  return NextResponse.json({ success: true, allocated: allocation[0] });
}
