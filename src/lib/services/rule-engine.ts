/**
 * Trading rule engine — PHASE 2, NOT YET IMPLEMENTED.
 * Defines the contract for evaluating a trading account against
 * Voltex Funding's actual published rules (10% profit target per phase,
 * 20% Balance-Based Trailing Drawdown, 5-day activity requirement, etc.
 * — see /trading-rules on the live site for the full, current rule set).
 * This will run against live data from metaapi.ts.
 */

import type { AccountMetrics } from "./metaapi";

export interface RuleCheckResult {
  passed: boolean;
  breached: boolean;
  reason: string | null;
}

export async function checkTrailingDrawdown(_metrics: AccountMetrics): Promise<RuleCheckResult> {
  throw new Error("checkTrailingDrawdown is not implemented yet — Phase 2 (Rule Engine).");
}

export async function checkProfitTarget(_metrics: AccountMetrics, _startingBalance: number): Promise<RuleCheckResult> {
  throw new Error("checkProfitTarget is not implemented yet — Phase 2 (Rule Engine).");
}

export async function checkActivityRequirement(_userId: string): Promise<RuleCheckResult> {
  throw new Error("checkActivityRequirement is not implemented yet — Phase 2 (Rule Engine).");
}
