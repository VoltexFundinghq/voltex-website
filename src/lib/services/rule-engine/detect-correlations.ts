import type { AccountTradeSet, CorrelationFlag, CorrelationTrade } from "./correlation-types";

const TIME_WINDOW_SECONDS = 60;
const SIZE_SIMILARITY_TOLERANCE = 0.3;

/**
 * Flags POSSIBLE copy trading or reverse hedging between accounts.
 * Deliberately never auto-fails anything — every result here is a
 * candidate for manual review, not a verdict.
 *
 * IMPORTANT: same-user accounts are only skipped for SAME-DIRECTION
 * matches (legitimate copy trading, explicitly allowed across a
 * trader's own multiple accounts). OPPOSITE-direction matches between
 * a trader's own accounts are still flagged as reverse hedging —
 * per published rules, this is prohibited with NO same-user
 * exception, unlike copy trading.
 *
 * Cross-user matches are flagged in both directions, same as before.
 */
export function detectCrossAccountCorrelations(accounts: AccountTradeSet[]): CorrelationFlag[] {
  const flags: CorrelationFlag[] = [];

  for (let i = 0; i < accounts.length; i++) {
    for (let j = i + 1; j < accounts.length; j++) {
      const accountA = accounts[i];
      const accountB = accounts[j];

      const isSameUser = accountA.userId === accountB.userId;

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

          // Same user, same direction = legitimate copy trading across
          // their own accounts — explicitly allowed, skip entirely.
          if (isSameUser && sameDirection) continue;

          // Same user, OPPOSITE direction = reverse hedging — still
          // flagged even between a trader's own accounts, since this
          // specific practice has no same-user exception.

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
