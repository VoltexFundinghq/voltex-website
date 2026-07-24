export interface NewsEvent {
  eventTime: Date;
}

export interface TradeForNewsCheck {
  id: string;
  openTime: Date;
  closeTime: Date;
}

export interface NewsTradingViolation {
  tradeId: string;
  eventTime: Date;
  message: string;
}

const PRE_NEWS_WINDOW_MINUTES = 4;
const POST_NEWS_HOLD_MINUTES = 4;

/**
 * Confirmed rule: news trading itself is always allowed. The only
 * requirement — if a trade opens within 4 minutes BEFORE a high-impact
 * release, that trade must stay open at least 4 minutes AFTER the
 * release. Prevents entering right before a spike and bailing the
 * instant it hits.
 */
export function checkNewsTrading(trades: TradeForNewsCheck[], highImpactEvents: NewsEvent[]): NewsTradingViolation[] {
  const violations: NewsTradingViolation[] = [];

  for (const trade of trades) {
    for (const event of highImpactEvents) {
      const minutesBeforeEvent = (event.eventTime.getTime() - trade.openTime.getTime()) / (1000 * 60);

      const openedInPreNewsWindow = minutesBeforeEvent >= 0 && minutesBeforeEvent <= PRE_NEWS_WINDOW_MINUTES;
      if (!openedInPreNewsWindow) continue;

      const requiredMinimumCloseTime = new Date(event.eventTime.getTime() + POST_NEWS_HOLD_MINUTES * 60 * 1000);
      const closedTooEarly = trade.closeTime.getTime() < requiredMinimumCloseTime.getTime();

      if (closedTooEarly) {
        violations.push({
          tradeId: trade.id,
          eventTime: event.eventTime,
          message: `Trade opened ${minutesBeforeEvent.toFixed(1)} min before a high-impact news release and closed before the required ${POST_NEWS_HOLD_MINUTES}-minute post-release hold.`,
        });
      }
    }
  }

  return violations;
}
