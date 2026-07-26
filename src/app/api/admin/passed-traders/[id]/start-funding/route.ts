import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { sendFundedAccountEmail } from "@/lib/services/email/templates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const challengeQuery = await serviceClient.from("user_challenges").select("*").eq("id", id).eq("status", "passed").single();
  const challenge = challengeQuery.data as any;
  if (challengeQuery.error || !challenge) {
    return NextResponse.json({ error: "Passed challenge not found" }, { status: 404 });
  }

  const accountSizeQuery = challenge.trading_account_id
    ? await serviceClient.from("trading_accounts").select("account_size").eq("id", challenge.trading_account_id).single()
    : { data: null };
  const accountSize = (accountSizeQuery.data as any)?.account_size ?? null;
  if (!accountSize) {
    return NextResponse.json({ error: "Could not determine account size from the original challenge" }, { status: 400 });
  }

  const { data: allocation, error: allocError } = await (serviceClient.rpc as any)("allocate_trading_account", {
    p_user_challenge_id: challenge.id,
    p_account_size: accountSize,
  });

  if (allocError || !allocation || allocation.length === 0) {
    return NextResponse.json({ error: "No available inventory for this size right now" }, { status: 409 });
  }

  const newAccount = allocation[0];

  const { data: newChallenge, error: insertError } = await (serviceClient.from("user_challenges") as any)
    .insert({
      user_id: challenge.user_id,
      challenge_id: challenge.challenge_id,
      trading_account_id: newAccount.account_id,
      status: "active",
      current_phase: 3,
      profit_target: challenge.profit_target,
      drawdown_limit: challenge.drawdown_limit,
      profit_split: challenge.profit_split,
      start_date: new Date().toISOString(),
      peak_closed_balance: accountSize,
      account_login: newAccount.login,
      account_password: newAccount.password,
      account_investor_password: newAccount.investor_password,
      account_server: newAccount.server,
      account_broker: newAccount.broker,
    })
    .select()
    .single();

  if (insertError || !newChallenge) {
    return NextResponse.json({ error: "Failed to create funded account record" }, { status: 500 });
  }

  const userQuery = await serviceClient.from("users").select("email").eq("id", challenge.user_id).single();
  const userRow = userQuery.data as { email: string } | null;
  if (userRow?.email) {
    await sendFundedAccountEmail(userRow.email, {
      accountSize: `₦${Number(accountSize).toLocaleString()}`,
      login: newAccount.login,
      password: newAccount.password,
      server: newAccount.server,
      broker: newAccount.broker,
    });
  }

  return NextResponse.json({ success: true, login: newAccount.login });
}
