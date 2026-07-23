import type { ClosedTrade, RuleEngineInput, RuleEngineResult, RuleViolation } from "./types";

const PROFIT_TARGET_PERCENT = 10;
const DRAWDOWN_LIMIT_PERCENT = 20;
const MIN_HOLD_TIME_MINUTES = 3;
const MAX_HOLD_TIME_WARNINGS = 3;
const INACTIVITY_LIMIT_DAYS = 5;

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60);
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Evaluates a challenge against Voltex Funding's core rules.
 *
 * IMPORTANT (confirmed business rule): drawdown is a FIXED dollar
 * amount, calculated once from startingBalance — it never grows even
 * as the peak rises. Floor = peak - (startingBalance x 20%), NOT
 * peak x 80%. The floor still moves up with the peak; only the WIDTH
 * of the allowed drop stays permanently fixed.
 */
export function evaluateChallenge(input: RuleEngineInput): RuleEngineResult {
  const { startingBalance, closedTrades, challengeStartDate, evaluationDate, priorHoldTimeWarnings } = input;

  const violations: RuleViolation[] = [];
  let breachedRule: RuleEngineResult["breachedRule"] = null;
  let holdTimeWarnings = priorHoldTimeWarnings;

  let balance = startingBalance;
  let peak = startingBalance;

  const fixedAllowedLossAmount = startingBalance * (DRAWDOWN_LIMIT_PERCENT / 100);

  for (const trade of closedTrades) {
    if (breachedRule) break;

    balance += trade.profit;
    if (balance > peak) {
      peak = balance;
    }

    const holdMinutes = minutesBetween(trade.openTime, trade.closeTime);
    if (holdMinutes < MIN_HOLD_TIME_MINUTES) {
      holdTimeWarnings += 1;
      const isFatal = holdTimeWarnings > MAX_HOLD_TIME_WARNINGS;

      violations.push({
        rule: "min_hold_time",
        message: isFatal
          ? `Trade ${trade.id} on ${trade.symbol} held ${holdMinutes.toFixed(1)} min — occurrence #${holdTimeWarnings}, exceeding the ${MAX_HOLD_TIME_WARNINGS}-warning limit. Account failed.`
          : `Trade ${trade.id} on ${trade.symbol} held ${holdMinutes.toFixed(1)} min, below the ${MIN_HOLD_TIME_MINUTES}-minute minimum. Warning ${holdTimeWarnings}/${MAX_HOLD_TIME_WARNINGS}.`,
        tradeId: trade.id,
        profit: trade.profit,
        detectedAt: trade.closeTime,
      });

      if (isFatal) {
        breachedRule = "min_hold_time";
      }
    }

    if (breachedRule) break;

    const drawdownFloor = peak - fixedAllowedLossAmount;
    if (balance <= drawdownFloor) {
      violations.push({
        rule: "trailing_drawdown",
        message: `Balance of ${balance.toFixed(2)} fell to or below the drawdown floor of ${drawdownFloor.toFixed(2)} (fixed allowed loss of ${fixedAllowedLossAmount.toFixed(2)} below peak of ${peak.toFixed(2)}).`,
        tradeId: trade.id,
        profit: trade.profit,
        detectedAt: trade.closeTime,
      });
      breachedRule = "trailing_drawdown";
    }
  }

  if (!breachedRule) {
    const timelinePoints = [
      challengeStartDate,
      ...closedTrades.map((t) => t.openTime),
      evaluationDate,
    ].sort((a, b) => a.getTime() - b.getTime());

    for (let i = 1; i < timelinePoints.length; i++) {
      const gapDays = daysBetween(timelinePoints[i - 1], timelinePoints[i]);
      if (gapDays > INACTIVITY_LIMIT_DAYS) {
        violations.push({
          rule: "inactivity",
          message: `No trade activity for ${gapDays.toFixed(1)} days, exceeding the ${INACTIVITY_LIMIT_DAYS}-day limit. Account failed.`,
          detectedAt: timelinePoints[i],
        });
        breachedRule = "inactivity";
        break;
      }
    }
  }

  const currentProfitPercent = ((balance - startingBalance) / startingBalance) * 100;
  const profitTargetMet = currentProfitPercent >= PROFIT_TARGET_PERCENT;
  const currentDrawdownPercent = peak > 0 ? Math.max(0, ((peak - balance) / peak) * 100) : 0;

  let outcome: RuleEngineResult["outcome"] = "in_progress";
  if (breachedRule) {
    outcome = "failed";
  } else if (profitTargetMet) {
    outcome = "passed";
  }

  return {
    outcome,
    finalBalance: balance,
    profitTargetPercent: PROFIT_TARGET_PERCENT,
    currentProfitPercent,
    profitTargetMet,
    peakClosedBalance: peak,
    drawdownLimitPercent: DRAWDOWN_LIMIT_PERCENT,
    currentDrawdownPercent,
    violations,
    breachedRule,
    totalHoldTimeWarnings: holdTimeWarnings,
  };
}
