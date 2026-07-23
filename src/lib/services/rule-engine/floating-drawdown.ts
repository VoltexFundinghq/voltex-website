export interface FloatingDrawdownCheck {
  peakClosedBalance: number; // still trails upward on every new closed-trade high
  currentEquity: number;     // closed balance + floating P&L of open positions
  drawdownLimitPercent: number;
  startingBalance: number;   // the account's ORIGINAL size — used to compute a FIXED allowed-loss amount, calculated once
}

export interface FloatingDrawdownResult {
  breached: boolean;
  drawdownFloor: number;
  currentDrawdownPercent: number;
  fixedAllowedLossAmount: number;
}

/**
 * Checks LIVE, FLOATING equity against the drawdown floor.
 *
 * IMPORTANT (confirmed business rule): the ALLOWED LOSS is a FIXED
 * dollar amount, calculated once from the account's ORIGINAL starting
 * balance — e.g. 500,000 x 20% = 100,000, forever. This amount never
 * grows even as the peak climbs. The floor still moves UP as the peak
 * rises (floor = peak - fixedAmount), but the WIDTH of the allowed
 * drop stays permanently fixed — NOT a percentage of the current,
 * growing peak. Confirmed directly against real numbers: at a peak of
 * 540,000 on a 500,000 account, the floor is 440,000 (540,000 -
 * 100,000), not 432,000 (540,000 x 0.80).
 */
export function checkFloatingDrawdown(input: FloatingDrawdownCheck): FloatingDrawdownResult {
  const { peakClosedBalance, currentEquity, drawdownLimitPercent, startingBalance } = input;

  const fixedAllowedLossAmount = startingBalance * (drawdownLimitPercent / 100);
  const drawdownFloor = peakClosedBalance - fixedAllowedLossAmount;
  const breached = currentEquity <= drawdownFloor;
  const currentDrawdownPercent = peakClosedBalance > 0
    ? Math.max(0, ((peakClosedBalance - currentEquity) / peakClosedBalance) * 100)
    : 0;

  return { breached, drawdownFloor, currentDrawdownPercent, fixedAllowedLossAmount };
}
