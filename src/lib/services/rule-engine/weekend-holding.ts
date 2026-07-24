export interface OpenPosition {
  ticket: string;
  symbol: string;
  openTime: Date;
}

export interface WeekendHoldingCheck {
  openPositions: OpenPosition[];
  currentTime: Date;
  alreadyFlaggedTickets: string[];
  priorWeekendWarnings: number;
}

export interface WeekendHoldingResult {
  hasNewViolations: boolean;
  breached: boolean;
  newWarningCount: number;
  newlyFlaggedTickets: string[];
  allFlaggedTickets: string[];
  violatingSymbols: string[];
}

// Exness commonly appends "m" to symbol names (e.g. BTCUSDm) — matched
// via startsWith so both forms are correctly recognized as exempt.
const EXEMPT_WEEKEND_SYMBOLS = ["BTCUSD", "ETHUSD"];

function isExemptSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return EXEMPT_WEEKEND_SYMBOLS.some((s) => upper.startsWith(s));
}

/**
 * Confirmed business rule: BTC/USD and ETH/USD may be freely traded
 * AND held open across the weekend — their markets never close, so
 * there's no gap risk to protect against. Every OTHER instrument still
 * open during the weekend window is a violation: 1st occurrence is a
 * warning, 2nd is a breach.
 *
 * Each SPECIFIC open position can only ever count as one violation,
 * tracked via its ticket number — holding one position open for an
 * entire weekend is one violation, not one per check-in.
 */
export function checkWeekendHolding(input: WeekendHoldingCheck): WeekendHoldingResult {
  const { openPositions, currentTime, alreadyFlaggedTickets, priorWeekendWarnings } = input;

  const day = currentTime.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const isWeekendWindow = day === 0 || day === 6;

  if (!isWeekendWindow) {
    return {
      hasNewViolations: false,
      breached: false,
      newWarningCount: priorWeekendWarnings,
      newlyFlaggedTickets: [],
      allFlaggedTickets: alreadyFlaggedTickets,
      violatingSymbols: [],
    };
  }

  const newlyViolating = openPositions.filter(
    (p) => !isExemptSymbol(p.symbol) && !alreadyFlaggedTickets.includes(p.ticket)
  );

  if (newlyViolating.length === 0) {
    return {
      hasNewViolations: false,
      breached: false,
      newWarningCount: priorWeekendWarnings,
      newlyFlaggedTickets: [],
      allFlaggedTickets: alreadyFlaggedTickets,
      violatingSymbols: [],
    };
  }

  const newlyFlaggedTickets = newlyViolating.map((p) => p.ticket);
  const newWarningCount = priorWeekendWarnings + newlyViolating.length;
  const breached = newWarningCount > 1;

  return {
    hasNewViolations: true,
    breached,
    newWarningCount,
    newlyFlaggedTickets,
    allFlaggedTickets: [...alreadyFlaggedTickets, ...newlyFlaggedTickets],
    violatingSymbols: newlyViolating.map((p) => p.symbol),
  };
}
