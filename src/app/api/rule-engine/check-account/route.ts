import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkFloatingDrawdown } from "@/lib/services/rule-engine/floating-drawdown";
import { createNotification } from "@/lib/database/notifications";
import { getAdminUserIds } from "@/lib/database/admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { accountLogin, balance, equity } = body;

  if (!accountLogin || balance === undefined || equity === undefined) {
    return NextResponse.json({ error: "Missing accountLogin, balance, or equity" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { data: account, error: accountError } = await serviceClient
    .from("trading_accounts")
    .select("id")
    .eq("login", String(accountLogin))
    .single();

  if (accountError || !account) {
    return NextResponse.json({ status: "ignored", reason: "unknown account" });
  }

  const { data: challenge, error: challengeError } = await serviceClient
    .from("user_challenges")
    .select("*")
    .eq("trading_account_id", account.id)
    .eq("status", "active")
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ status: "ignored", reason: "no active challenge for this account" });
  }

  let peakClosedBalance = challenge.peak_closed_balance;
  if (peakClosedBalance === null || balance > peakClosedBalance) {
    peakClosedBalance = balance;
    await serviceClient
      .from("user_challenges")
      .update({ peak_closed_balance: peakClosedBalance })
      .eq("id", challenge.id);
  }

  const result = checkFloatingDrawdown({
    peakClosedBalance,
    currentEquity: equity,
    drawdownLimitPercent: challenge.drawdown_limit,
  });

  if (result.breached) {
    const { error: rpcError } = await serviceClient.rpc("complete_user_challenge", {
      p_user_challenge_id: challenge.id,
      p_outcome: "failed",
    });

    if (!rpcError) {
      await createNotification({
        userId: challenge.user_id,
        title: "Challenge Failed — Drawdown Breach",
        message: `Your account breached the ${challenge.drawdown_limit}% drawdown limit. Equity ${equity} fell below the floor of ${result.drawdownFloor.toFixed(2)}.`,
      });

      const adminIds = await getAdminUserIds();
      for (const adminId of adminIds) {
        await createNotification({
          userId: adminId,
          title: "Drawdown Breach Detected",
          message: `Account ${accountLogin} breached drawdown — user_challenge ${challenge.id} marked failed.`,
        });
      }
    }

    return NextResponse.json({ status: "breached", ...result });
  }

  return NextResponse.json({ status: "ok", ...result });
}
