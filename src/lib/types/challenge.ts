export type ChallengeStatus = "active" | "coming_soon";
export type DrawdownType = "balance_based_trailing";

/**
 * Rules shared identically across every challenge tier.
 */
export interface ChallengeRules {
  profit_target_percent: number;
  max_drawdown_percent: number;
  drawdown_type: DrawdownType;
  profit_split_percent: number;
  platform: string;
  phases: number;
  min_hold_time_minutes: number;
  activity_requirement_days: number;
}

/**
 * A single purchasable (or upcoming) challenge tier.
 */
export interface ChallengeProduct {
  id: string;
  challenge_name: string;
  account_size: number;
  challenge_fee: number | null; // null for "coming soon" tiers
  status: ChallengeStatus;
  is_popular: boolean;
}
