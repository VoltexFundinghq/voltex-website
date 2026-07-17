import { createServiceClient } from "@/lib/supabase/service";

/**
 * Marks a challenge as passed or failed, and atomically pulls its
 * trading account out of circulation into "resetting" status — freeing
 * assigned_to immediately, since the trader's own permanent record of
 * their credentials already lives safely in user_challenges' snapshot
 * columns, independent of whatever happens to the account next.
 */
export async function completeUserChallenge(
  userChallengeId: string,
  outcome: "passed" | "failed"
): Promise<boolean> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.rpc("complete_user_challenge", {
    p_user_challenge_id: userChallengeId,
    p_outcome: outcome,
  });

  if (error) {
    console.error("completeUserChallenge failed:", error);
    return false;
  }
  return true;
}

/**
 * Admin-only: call this once you've manually reset an account on
 * Exness's side (cleared its balance/trade history) — makes it eligible
 * to be assigned to a new trader again.
 */
export async function confirmAccountReset(tradingAccountId: string): Promise<boolean> {
  const serviceClient = createServiceClient();
  const { error } = await serviceClient.rpc("mark_account_available", {
    p_account_id: tradingAccountId,
  });

  if (error) {
    console.error("confirmAccountReset failed:", error);
    return false;
  }
  return true;
}
