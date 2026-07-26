import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const challengeId = body.challengeId as string;
  if (!challengeId) return NextResponse.json({ error: "challengeId is required" }, { status: 400 });

  const serviceClient = createServiceClient();
  const accountQuery = await serviceClient.from("trading_accounts").select("account_size, status").eq("id", id).single();
  const account = accountQuery.data as { account_size: number; status: string } | null;
  if (!account || account.status !== "available") {
    return NextResponse.json({ error: "This account is no longer available" }, { status: 409 });
  }

  const { data: allocation, error } = await (serviceClient.rpc as any)("allocate_trading_account", {
    p_user_challenge_id: challengeId,
    p_account_size: account.account_size,
  });

  if (error || !allocation || allocation.length === 0) {
    return NextResponse.json({ error: "Assignment failed — account may have just been claimed elsewhere" }, { status: 409 });
  }

  return NextResponse.json({ success: true, login: allocation[0].login });
}
