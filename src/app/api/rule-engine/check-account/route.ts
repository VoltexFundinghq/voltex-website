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
const INACTIVITY_WARNING_DAY = 4;
const INACTIVITY_BREACH_DAY = 5;
const PROFIT_TARGET_PERCENT = 10;

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

async function handlePassed(
  serviceClient: ReturnType<typeof createServiceClient>,
  challenge: UserChallenge,
  accountLogin: string,
  currentProfitPercent: number
) {
  if (challenge.current_phase === 1) {
    await (serviceClient.from("user_challenges") as any)
      .update({ current_phase: 2, phase_transition_pending: true })
      .eq("id", challenge.id);
    await notifyTrader(
      serviceClient,
      challenge.user_id,
      "Phase 1 Passed!",
      `You've passed Phase 1 with ${currentProfitPercent.toFixed(2)}% profit. We'll reset your balance shortly to begin Phase 2 — keep the same login open.`
    );
    for (const adminId of await getAdminUserIds()) {
      await createNotification({
        userId: adminId,
        title: "Phase 1 Passed — Manual Reset Needed",
        message: `Account ${accountLogin} passed Phase 1. Please manually reset the balance on Exness — our system will detect it automatically.`,
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
}

export async function POST(request: Request) {
  const body = await request.json();
  const { accountLogin, balance, equity, closedTrades, latestBalanceDealId } = body;

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

  const challenge = challengeQuery.data as UserChallenge & { balance_detection_paused?: boolean } | null;
  if (challengeQuery.error || !challenge) {
    return NextResponse.json({ status: "ignored", reason: "no active challenge for this account" });
  }

  if (Array.isArray(closedTrades)) {
    for (const t of closedTrades) {
      await (serviceClient.from("recorded_trades") as any)
        .upsert(
          {
            user_challenge_id: challenge.id,
            trade_id: String(t.id),
            symbol: t.symbol,
            profit: Number(t.profit),
            phase: challenge.current_phase,
            open_time: t.openTime,
            close_time: t.closeTime,
          },
          { onConflict: "user_challenge_id,trade_id", ignoreDuplicates: true }
        );
    }
  }

  // --- PROFIT TARGET: reads REAL, CURRENT balance directly — same
  // source of truth drawdown already uses. Runs regardless of the
  // balance_detection_paused flag, since that flag only guards the
  // separate Phase-2-reset detection below, not this. ---
  const numericBalance = Number(balance);
  const currentProfitPercent = ((numericBalance - account.account_size) / account.account_size) * 100;
  if (currentProfitPercent >= PROFIT_TARGET_PERCENT && challenge.status === "active") {
    await handlePassed(serviceClient, challenge, accountLogin, currentProfitPercent);
    return NextResponse.json({ status: "passed", currentProfitPercent });
  }

  const dealId = Number(latestBalanceDealId ?? 0);
  if (
    !challenge.balance_detection_paused &&
    dealId > 0 &&
    dealId > (challenge.last_balance_deal_id ?? 0)
  ) {
    await (serviceClient.from("user_challenges") as any)
      .update({
        phase_reset_baseline_balance: numericBalance,
        peak_closed_balance: numericBalance,
        phase_transition_pending: false,
        last_balance_deal_id: dealId,
      })
      .eq("id", challenge.id);

    await notifyTrader(
      serviceClient,
      challenge.user_id,
      "Phase 2 Started",
      `Your account balance has been reset to ${numericBalance.toLocaleString()}. Phase 2 evaluation begins now — good luck!`
    );

    return NextResponse.json({ status: "phase_reset_confirmed", newBalance: balance });
  }

  const challengeStartDate = new Date(challenge.start_date ?? challenge.purchase_date);

  const currentPeak = challenge.peak_closed_balance;
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
    startingBalance: account.account_size,
  });

  if (
    !floatingResult.breached &&
    floatingResult.currentDrawdownPercent >= DRAWDOWN_WARNING_THRESHOLD_PERCENT &&
    !challenge.drawdown_warning_sent
  ) {
    const { data: claimed } = await (serviceClient.from("user_challenges") as any)
      .update({ drawdown_warning_sent: true })
      .eq("id", challenge.id)
      .eq("drawdown_warning_sent", false)
      .select();

    if (claimed && claimed.length > 0) {
      await notifyTrader(
        serviceClient,
        challenge.user_id,
        "Drawdown Warning",
        `Your account is currently ${floatingResult.currentDrawdownPercent.toFixed(1)}% down from your peak balance. Your challenge fails if you lose ${floatingResult.fixedAllowedLossAmount.toLocaleString()} total from your peak — please manage your risk carefully.`
      );
    }
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
      `Your account breached the drawdown limit. Equity ${equity} fell below the floor of ${floatingResult.drawdownFloor.toFixed(2)}.`
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

    const lastActivityTime = Math.max(
      challengeStartDate.getTime(),
      ...trades.map((t) => t.openTime.getTime())
    );
    const daysSinceLastActivity = (Date.now() - lastActivityTime) / (1000 * 60 * 60 * 24);

    if (
      daysSinceLastActivity >= INACTIVITY_WARNING_DAY &&
      daysSinceLastActivity < INACTIVITY_BREACH_DAY &&
      !challenge.inactivity_warning_sent
    ) {
      const { data: claimed } = await (serviceClient.from("user_challenges") as any)
        .update({ inactivity_warning_sent: true })
        .eq("id", challenge.id)
        .eq("inactivity_warning_sent", false)
        .select();

      if (claimed && claimed.length > 0) {
        await notifyTrader(
          serviceClient,
          challenge.user_id,
          "Inactivity Warning",
          `You haven't placed a trade in ${Math.floor(daysSinceLastActivity)} days. Your challenge will be breached if you reach 5 days of inactivity — place a trade soon to stay active.`
        );
      }
    }

    // evaluateChallenge() still runs — but now ONLY to catch hold-time
    // warnings and inactivity breaches, both of which genuinely need
    // the real trade list. Its own internal profit-target/drawdown
    // outcome is deliberately ignored here — those are now handled
    // above, directly from real balance.
    const result = evaluateChallenge({
      startingBalance: account.account_size,
      closedTrades: trades,
      challengeStartDate,
      evaluationDate: new Date(),
      priorHoldTimeWarnings: 0,
    });

    if (result.breachedRule === "min_hold_time" || result.breachedRule === "inactivity") {
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

    if (result.totalHoldTimeWarnings > (challenge.hold_time_warnings_notified ?? 0)) {
      const warningNumber = result.totalHoldTimeWarnings;

      const { data: claimed } = await (serviceClient.from("user_challenges") as any)
        .update({ hold_time_warnings_notified: warningNumber })
        .eq("id", challenge.id)
        .lt("hold_time_warnings_notified", warningNumber)
        .select();

      if (claimed && claimed.length > 0 && warningNumber === 2) {
        await notifyTrader(
          serviceClient,
          challenge.user_id,
          "Second Warning — Minimum Hold Time",
          `This is your second warning for closing a trade too quickly. If you close 2 more trades in under 3 minutes, your challenge will be breached.`
        );
      }

      if (claimed && claimed.length > 0) {
        for (const adminId of await getAdminUserIds()) {
          await createNotification({
            userId: adminId,
            title: "Hold-Time Warning Issued",
            message: `Account ${accountLogin} received hold-time warning ${warningNumber}/3.`,
          });
        }
      }
    }

    return NextResponse.json({ status: "ok", holdTimeWarnings: result.totalHoldTimeWarnings, drawdown: floatingResult, currentProfitPercent });
  }

  return NextResponse.json({ status: "ok", drawdown: floatingResult, currentProfitPercent });
}
