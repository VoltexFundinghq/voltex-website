export interface ClosedTrade {
  id: string;
  symbol: string;
  openTime: Date;
  closeTime: Date;
  profit: number; // realized P&L, net — this is what actually moves closed balance
  volume: number;
}

export interface RuleEngineInput {
  startingBalance: number;
  closedTrades: ClosedTrade[]; // must be chronologically ordered by closeTime
  challengeStartDate: Date;
  evaluationDate: Date; // "now" — when this check is being run
  priorHoldTimeWarnings: number; // running count from BEFORE this evaluation — persisted in the database, not recomputed from scratch each run
}

export type RuleName = "min_hold_time" | "inactivity" | "trailing_drawdown";

export interface RuleViolation {
  rule: RuleName;
  message: string;
  tradeId?: string;
  profit?: number; // the exact P&L of the specific trade tied to this violation — kept alongside the message so a dispute can point at one unambiguous number
  detectedAt: Date; // exact timestamp of the violation — the trade's own close time, not "when the engine happened to run"
}

export interface RuleEngineResult {
  outcome: "in_progress" | "passed" | "failed";
  finalBalance: number;
  profitTargetPercent: number;
  currentProfitPercent: number;
  profitTargetMet: boolean;
  peakClosedBalance: number;
  drawdownLimitPercent: number;
  currentDrawdownPercent: number;
  violations: RuleViolation[];
  breachedRule: RuleName | null;
  totalHoldTimeWarnings: number; // priorHoldTimeWarnings + any NEW ones from this run — caller must persist this back
}
