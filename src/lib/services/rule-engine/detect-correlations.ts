import type { AccountTradeSet, CorrelationFlag, CorrelationTrade } from "./correlation-types";

const TIME_WINDOW_SECONDS = 60; // trades opened within this window of each other are considered matching timing
const SIZE_SIMILARITY_TOLERANCE = 0.3; // volumes within 30% of each other count as "similar size"

/**
 * Flags POSSIBLE copy trading or reverse hedging between DIFFERENT
 * traders' accounts. Deliberately never auto-fails anything — every
 * result here is a candidate for manual review, not a verdict.
 *
 * Same-user accounts are always skipped entirely, since copy trading
 * across your OWN multiple accounts is explicitly allowed.
 *
 * These thresholds (60-second window, 30% size tolerance) are a
 * starting point, not a scientifically precise line — heavily-traded
 * symbols like EURUSD or XAUUSD will produce coincidental matches
 * between genuinely unrelated traders. That's exactly why this flags
 * for review instead of failing anything automatically.
 */
export function detectCrossAccountCorrelations(accounts: AccountTradeSet[]): CorrelationFlag[] {
  const flags: CorrelationFlag[] = [];

  for (let i = 0; i < accounts.length; i++) {
    for (let j = i + 1; j < accounts.length; j++) {
      const accountA = accounts[i];
      const accountB = accounts[j];

      if (accountA.userId === accountB.userId) continue; // same trader — allowed, skip entirely

      for (const tradeA of accountA.trades) {
        for (const tradeB of accountB.trades) {
          if (tradeA.symbol !== tradeB.symbol) continue;

          const timeGapSeconds = Math.abs(tradeA.openTime.getTime() - tradeB.openTime.getTime()) / 1000;
          if (timeGapSeconds > TIME_WINDOW_SECONDS) continue;

          const largerVolume = Math.max(tradeA.volume, tradeB.volume);
          const volumeDiff = Math.abs(tradeA.volume - tradeB.volume);
          const sizesAreSimilar = largerVolume > 0 && volumeDiff / largerVolume <= SIZE_SIMILARITY_TOLERANCE;
          if (!sizesAreSimilar) continue;

          const sameDirection = tradeA.direction === tradeB.direction;

          flags.push({
            correlationType: sameDirection ? "copy_trading" : "reverse_hedging",
            userAId: accountA.userId,
            userBId: accountB.userId,
            tradeAId: tradeA.id,
            tradeBId: tradeB.id,
            symbol: tradeA.symbol,
            timeGapSeconds,
            volumeA: tradeA.volume,
            volumeB: tradeB.volume,
          });
        }
      }
    }
  }

  return flags;
}
