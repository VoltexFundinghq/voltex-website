import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkFloatingDrawdown } from "@/lib/services/rule-engine/floating-drawdown";
import { evaluateChallenge } from "@/lib/services/rule-engine/evaluate";
import { createNotification } from "@/lib/database/notifications";
import { getAdminUserIds } from "@/lib/database/admin";
import type { UserChallenge } from "@/lib/types/database";
import type { ClosedTrade } from "@/lib/services/rule-engine/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { accountLogin, balance, equity, closedTrades } = body;

  if (!accountLogin || balance === undefined || equity === undefined) {
    return NextResponse.json({ error: "Missing accountLogin, balance, or equity" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const accountQuery = await serviceClient
    .from("trading_accounts")
    .select("id, account_size")
    .eq("login", String(accountLogin))
    .single();

  const account = accountQuery.data as { id: string; account_size: number } | null;
  if (accountQuery.error || !account) {
    return NextResponse.json({ status: "ignored", reason: "unknown account" });
  }

  const challengeQuery = await serviceClient
    .from("user_challenges")
    .select("*")
    .eq("trading_account_id", account.id)
    .eq("status", "active")
    .single();

  const challenge = challengeQuery.data as UserChallenge | null;
  if (challengeQuery.error || !challenge) {
    return NextResponse.json({ status: "ignored", reason: "no active challenge for this account" });
  }

  const currentPeak = challenge.peak_closed_balance;
  const numericBalance = Number(balance);
  const peakClosedBalance: number =
    currentPeak === null ? numericBalance : Math.max(currentPeak, numericBalance);
  const peakNeedsUpdate = currentPeak === null || numericBalance > currentPeak;

  if (peakNeedsUpdate) {
    await (serviceClient.from("user_challenges") as any)
      .update({ peak_closed_balance: peakClosedBalance })
      .eq("id", challenge.id);
  }

  const floatingResult = checkFloatingDrawdown({
    peakClosedBalance,
    currentEquity: equity,
    drawdownLimitPercent: challenge.drawdown_limit,
  });

  if (floatingResult.breached) {
    await (serviceClient.rpc as any)("complete_user_challenge", {
      p_user_challenge_id: challenge.id,
      p_outcome: "failed",
    });
    await createNotification({
      userId: challenge.user_id,
      title: "Challenge Failed — Drawdown Breach",
      message: `Your account breached the ${challenge.drawdown_limit}% drawdown limit. Equity ${equity} fell below the floor of ${floatingResult.drawdownFloor.toFixed(2)}.`,
    });
    for (const adminId of await getAdminUserIds()) {
      await createNotification({
        userId: adminId,
        title: "Drawdown Breach Detected",
        message: `Account ${accountLogin} breached drawdown — user_challenge ${challenge.id} marked failed.`,
      });
    }
    return NextResponse.json({ status: "breached", rule: "trailing_drawdown", ...floatingResult });
  }

  if (Array.isArray(closedTrades)) {
    const trades: ClosedTrade[] = closedTrades.map((t: any) => ({
      id: String(t.id),
      symbol: t.symbol,
      openTime: new Date(t.openTime),
      closeTime: new Date(t.closeTime),
      profit: Number(t.profit),
      volume: Number(t.volume),
    }));

    const result = evaluateChallenge({
      startingBalance: account.account_size,
      closedTrades: trades,
      challengeStartDate: new Date(challenge.start_date ?? challenge.purchase_date),
      evaluationDate: new Date(),
      priorHoldTimeWarnings: 0,
    });

    if (result.outcome === "failed") {
      await (serviceClient.rpc as any)("complete_user_challenge", {
        p_user_challenge_id: challenge.id,
        p_outcome: "failed",
      });
      await createNotification({
        userId: challenge.user_id,
        title: "Challenge Failed",
        message: `Your challenge was failed: ${result.violations[result.violations.length - 1]?.message ?? result.breachedRule}`,
      });
      for (const adminId of await getAdminUserIds()) {
        await createNotification({
          userId: adminId,
          title: "Challenge Failed",
          message: `Account ${accountLogin} failed rule "${result.breachedRule}" — user_challenge ${challenge.id}.`,
        });
      }
      return NextResponse.json({ status: "breached", rule: result.breachedRule, ...result });
    }

    if (result.outcome === "passed") {
      if (challenge.current_phase === 1) {
        await (serviceClient.rpc as any)("complete_phase_one", { p_user_challenge_id: challenge.id });
        await createNotification({
          userId: challenge.user_id,
          title: "Phase 1 Passed!",
          message: `You've passed Phase 1 with ${result.currentProfitPercent.toFixed(2)}% profit. Your account will be reset to start Phase 2 shortly.`,
        });
        for (const adminId of await getAdminUserIds()) {
          await createNotification({
            userId: adminId,
            title: "Phase 1 Passed — Manual Reset Needed",
            message: `Account ${accountLogin} passed Phase 1. Please manually reset the balance on Exness, then confirm via confirm_phase_two_started.`,
          });
        }
      } else {
        await (serviceClient.from("user_challenges") as any)
          .update({ status: "passed" })
          .eq("id", challenge.id);
        await createNotification({
          userId: challenge.user_id,
          title: "Challenge Passed!",
          message: `Congratulations — you've completed your evaluation. Our team will process your funded account shortly.`,
        });
        for (const adminId of await getAdminUserIds()) {
          await createNotification({
            userId: adminId,
            title: "Evaluation Passed — Funded Account Needed",
            message: `Account ${accountLogin} (user_challenge ${challenge.id}) passed Phase 2. Manual funded account issuance required.`,
          });
        }
      }
      return NextResponse.json({ status: "passed", ...result });
    }
  }

  return NextResponse.json({ status: "ok", drawdown: floatingResult });
}
