import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/database/notifications";
import { getAdminUserIds } from "@/lib/database/admin";
import { detectCrossAccountCorrelations } from "./detect-correlations";
import type { AccountTradeSet } from "./correlation-types";

/**
 * Runs correlation detection across all provided accounts, persists any
 * NEW flags (the trade_a_id/trade_b_id unique constraint means re-running
 * against the same data never creates duplicates), and notifies every
 * admin that a review is waiting. Never touches challenge status —
 * purely observational until a human reviews it.
 */
export async function runCorrelationCheck(accounts: AccountTradeSet[]): Promise<number> {
  const flags = detectCrossAccountCorrelations(accounts);
  if (flags.length === 0) return 0;

  const serviceClient = createServiceClient();
  let newFlagCount = 0;

  for (const flag of flags) {
    const { error } = await serviceClient.from("correlation_flags").insert({
      correlation_type: flag.correlationType,
      user_a_id: flag.userAId,
      user_b_id: flag.userBId,
      trade_a_id: flag.tradeAId,
      trade_b_id: flag.tradeBId,
      symbol: flag.symbol,
      time_gap_seconds: flag.timeGapSeconds,
      volume_a: flag.volumeA,
      volume_b: flag.volumeB,
    });

    // A unique constraint violation here just means this exact pair was
    // already flagged in a prior run — expected and fine, not an error.
    if (!error) {
      newFlagCount += 1;
    }
  }

  if (newFlagCount > 0) {
    const adminIds = await getAdminUserIds();
    for (const adminId of adminIds) {
      await createNotification({
        userId: adminId,
        title: "Correlation Review Needed",
        message: `${newFlagCount} new possible copy-trading/reverse-hedging match${newFlagCount > 1 ? "es" : ""} detected between different traders. Review in correlation_flags.`,
      });
    }
  }

  return newFlagCount;
}
