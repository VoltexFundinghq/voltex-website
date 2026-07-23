import type { ClosedTrade, RuleEngineInput, RuleEngineResult, RuleViolation } from "./types";

const PROFIT_TARGET_PERCENT = 10;
const DRAWDOWN_LIMIT_PERCENT = 20;
const MIN_HOLD_TIME_MINUTES = 3;
const MAX_HOLD_TIME_WARNINGS = 3; // the 4th violation is what actually fails the account (tightened from 5 to 4 total occurrences)
const INACTIVITY_LIMIT_DAYS = 5;

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60);
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Evaluates a challenge against Voltex Funding's core, self-contained
 * rules. Enforcement policy per rule (confirmed with the business):
 *   - Trailing Drawdown: immediate fail, no warnings.
 *   - 5-Day Inactivity: immediate fail, no warnings.
 *   - Minimum Hold Time: warning-based — 3 warnings allowed, the 4th
 *     violation fails the account (tightened from the original 4/5 split).
 *     A specific "second warning" email is sent to the trader at
 *     exactly the 2nd occurrence, giving a clear countdown before
 *     the 4th ends the challenge.
 *
 * Every trade's real P&L is ALWAYS applied to the balance, even if
 * that exact trade is the one that triggers a fatal violation.
 *
 * Deliberately excludes News Trading and Weekend Crypto — both need
 * infrastructure (calendar data, a separate persistent counter) not
 * yet built.
 *
 * Pure function: same input always produces the same output, zero
 * side effects — fully testable without a real MT5 connection.
 */
export function evaluateChallenge(input: RuleEngineInput): RuleEngineResult {
  const { startingBalance, closedTrades, challengeStartDate, evaluationDate, priorHoldTimeWarnings } = input;

  const violations: RuleViolation[] = [];
  let breachedRule: RuleEngineResult["breachedRule"] = null;
  let holdTimeWarnings = priorHoldTimeWarnings;

  let balance = startingBalance;
  let peak = startingBalance;

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
          ? `Trade ${trade.id} on ${trade.symbol} held ${holdMinutes.toFixed(1)} min — this is occurrence #${holdTimeWarnings}, exceeding the ${MAX_HOLD_TIME_WARNINGS}-warning limit. Account failed.`
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

    const drawdownFloor = peak * (1 - DRAWDOWN_LIMIT_PERCENT / 100);
    if (balance <= drawdownFloor) {
      violations.push({
        rule: "trailing_drawdown",
        message: `Balance of ${balance.toFixed(2)} fell to or below the drawdown floor of ${drawdownFloor.toFixed(2)} (${DRAWDOWN_LIMIT_PERCENT}% below peak of ${peak.toFixed(2)}).`,
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
