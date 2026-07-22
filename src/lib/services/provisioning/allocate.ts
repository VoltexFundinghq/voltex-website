import { createServiceClient } from "@/lib/supabase/service";
import { getChallengeById as getChallengeConfigById, CHALLENGE_RULES } from "@/lib/config/challenges";
import { sendChallengeCredentialsEmail } from "@/lib/services/email/templates";

export interface ProvisionResult {
  success: boolean;
  allocated: boolean;
  userChallengeId?: string;
}

/**
 * Creates a user_challenge record and attempts to atomically allocate an
 * available trading account of the matching size.
 */
export async function provisionChallengeAccount(params: {
  userId: string;
  userEmail: string;
  challengeConfigId: string;
}): Promise<ProvisionResult> {
  const challenge = getChallengeConfigById(params.challengeConfigId);
  if (!challenge) {
    console.error(`provisionChallengeAccount: unknown challenge id ${params.challengeConfigId}`);
    return { success: false, allocated: false };
  }

  const serviceClient = createServiceClient();

  const { data: userChallenge, error: createError } = await (serviceClient
    .from("user_challenges") as any)
    .insert({
      user_id: params.userId,
      challenge_id: params.challengeConfigId,
      status: "awaiting_allocation",
      profit_target: CHALLENGE_RULES.profit_target_percent,
      drawdown_limit: CHALLENGE_RULES.max_drawdown_percent,
      profit_split: CHALLENGE_RULES.profit_split_percent,
    })
    .select()
    .single();

  if (createError || !userChallenge) {
    console.error("provisionChallengeAccount: failed to create user_challenge", createError);
    return { success: false, allocated: false };
  }

  const { data: allocation, error: allocError } = await (serviceClient.rpc as any)("allocate_trading_account", {
    p_user_challenge_id: userChallenge.id,
    p_account_size: challenge.account_size,
  });

  if (allocError) {
    console.error("provisionChallengeAccount: allocation RPC failed", allocError);
    return { success: true, allocated: false, userChallengeId: userChallenge.id };
  }

  if (!allocation || allocation.length === 0) {
    console.warn(`provisionChallengeAccount: no available account for size ${challenge.account_size} — left as awaiting_allocation`);
    return { success: true, allocated: false, userChallengeId: userChallenge.id };
  }

  const account = allocation[0];

  await sendChallengeCredentialsEmail(params.userEmail, {
    challengeName: challenge.challenge_name,
    login: account.login,
    password: account.password,
    investorPassword: account.investor_password,
    server: account.server,
    broker: account.broker,
  });

  return { success: true, allocated: true, userChallengeId: userChallenge.id };
}
