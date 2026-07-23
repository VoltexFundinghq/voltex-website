import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkFloatingDrawdown } from "@/lib/services/rule-engine/floating-drawdown";
import { evaluateChallenge } from "@/lib/services/rule-engine/evaluate";
import { createNotification } from "@/lib/database/notifications";
import { getAdminUserIds } from "@/lib/database/admin";
import { sendRuleEngineAlertEmail } from "@/lib/services/email/templates";
import type { UserChallenge } from "@/lib/types/database";
import type { ClosedTrade } from "@/lib/services/rule-engine/types";

const DRAWDOWN_WARNING_THRESHOLD_PERCENT = 15;

async function getTraderEmail(serviceClient: ReturnType<typeof createServiceClient>, userId: string): Promise<string | null> {
  const query = await serviceClient.from("users").select("email").eq("id", userId).single();
  const data = query.data as { email: string } | null;
  return data?.email ?? null;
}

async function notifyTrader(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  title: string,
  message: string
) {
  await createNotification({ userId, title, message });
  const email = await getTraderEmail(serviceClient, userId);
  if (email) {
    await sendRuleEngineAlertEmail(email, { title, message });
  } else {
    console.error(`notifyTrader: no email found for user ${userId} — in-app notification created, but email NOT sent.`);
  }
}

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

  const challengeStartDate = new Date(challenge.start_date ?? challenge.purchase_date);

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

  // Proactive early-warning email at 15% drawdown, well before the
  // actual 20% breach — a real differentiator, giving the trader a
  // genuine chance to protect their account rather than being failed
  // with no notice. Fires exactly once per challenge.
  if (
    !floatingResult.breached &&
    floatingResult.currentDrawdownPercent >= DRAWDOWN_WARNING_THRESHOLD_PERCENT &&
    !challenge.drawdown_warning_sent
  ) {
    await notifyTrader(
      serviceClient,
      challenge.user_id,
      "Drawdown Warning",
      `Your account is currently ${floatingResult.currentDrawdownPercent.toFixed(1)}% down from your peak balance. Your challenge fails at ${challenge.drawdown_limit}% — please manage your risk carefully.`
    );
    await (serviceClient.from("user_challenges") as any)
      .update({ drawdown_warning_sent: true })
      .eq("id", challenge.id);
  }

  if (floatingResult.breached) {
    await (serviceClient.rpc as any)("complete_user_challenge", {
      p_user_challenge_id: challenge.id,
      p_outcome: "failed",
    });
    await notifyTrader(
      serviceClient,
      challenge.user_id,
      "Challenge Failed — Drawdown Breach",
      `Your account breached the ${challenge.drawdown_limit}% drawdown limit. Equity ${equity} fell below the floor of ${floatingResult.drawdownFloor.toFixed(2)}.`
    );
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
    const trades: ClosedTrade[] = closedTrades
      .map((t: any) => ({
        id: String(t.id),
        symbol: t.symbol,
        openTime: new Date(t.openTime),
        closeTime: new Date(t.closeTime),
        profit: Number(t.profit),
        volume: Number(t.volume),
      }))
      .filter((t) => t.closeTime.getTime() >= challengeStartDate.getTime());

    const result = evaluateChallenge({
      startingBalance: account.account_size,
      closedTrades: trades,
      challengeStartDate,
      evaluationDate: new Date(),
      priorHoldTimeWarnings: 0,
    });

    if (result.outcome === "failed") {
      await (serviceClient.rpc as any)("complete_user_challenge", {
        p_user_challenge_id: challenge.id,
        p_outcome: "failed",
      });
      await notifyTrader(
        serviceClient,
        challenge.user_id,
        "Challenge Failed",
        `Your challenge was failed: ${result.violations[result.violations.length - 1]?.message ?? result.breachedRule}`
      );
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
        await notifyTrader(
          serviceClient,
          challenge.user_id,
          "Phase 1 Passed!",
          `You've passed Phase 1 with ${result.currentProfitPercent.toFixed(2)}% profit. Your account will be reset to start Phase 2 shortly.`
        );
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
        await notifyTrader(
          serviceClient,
          challenge.user_id,
          "Challenge Passed!",
          `Congratulations — you've completed your evaluation. Our team will process your funded account shortly.`
        );
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

    if (result.totalHoldTimeWarnings > (challenge.hold_time_warnings_notified ?? 0)) {
      const warningNumber = result.totalHoldTimeWarnings;

      if (warningNumber === 2) {
        await notifyTrader(
          serviceClient,
          challenge.user_id,
          "Second Warning — Minimum Hold Time",
          `This is your second warning for closing a trade too quickly. If you close 2 more trades in under 3 minutes, your challenge will be breached.`
        );
      }

      for (const adminId of await getAdminUserIds()) {
        await createNotification({
          userId: adminId,
          title: "Hold-Time Warning Issued",
          message: `Account ${accountLogin} received hold-time warning ${warningNumber}/3.`,
        });
      }

      await (serviceClient.from("user_challenges") as any)
        .update({ hold_time_warnings_notified: warningNumber })
        .eq("id", challenge.id);
    }

    return NextResponse.json({ status: "ok", holdTimeWarnings: result.totalHoldTimeWarnings, drawdown: floatingResult });
  }

  return NextResponse.json({ status: "ok", drawdown: floatingResult });
}
