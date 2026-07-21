export interface FloatingDrawdownCheck {
  peakClosedBalance: number; // still based on highest CLOSED balance — unchanged
  currentEquity: number;     // closed balance + floating P&L of all currently open positions
  drawdownLimitPercent: number;
}

export interface FloatingDrawdownResult {
  breached: boolean;
  drawdownFloor: number;
  currentDrawdownPercent: number;
}

/**
 * Checks LIVE, FLOATING equity against the drawdown floor — this is
 * intentionally separate from evaluateChallenge()'s closed-balance
 * logic. Confirmed business decision: even a floating dip that later
 * recovers and closes in profit counts as an immediate breach the
 * moment it crosses the floor. The peak itself still only ever moves
 * on CLOSED balance — only the live/current side of the comparison
 * now includes floating P&L.
 *
 * This must be called frequently against live account data (polling)
 * to have a real chance of catching a fast dip — a gap between polls
 * could theoretically miss a very brief spike below the floor that
 * recovers before the next check.
 */
export function checkFloatingDrawdown(input: FloatingDrawdownCheck): FloatingDrawdownResult {
  const { peakClosedBalance, currentEquity, drawdownLimitPercent } = input;

  const drawdownFloor = peakClosedBalance * (1 - drawdownLimitPercent / 100);
  const breached = currentEquity <= drawdownFloor;
  const currentDrawdownPercent = peakClosedBalance > 0
    ? Math.max(0, ((peakClosedBalance - currentEquity) / peakClosedBalance) * 100)
    : 0;

  return { breached, drawdownFloor, currentDrawdownPercent };
}
