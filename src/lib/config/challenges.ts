/**
 * Challenge Product Configuration — single source of truth for every
 * purchasable challenge tier. Adding a new tier means adding one object
 * here; nothing else in the purchase flow needs to change.
 *
 * Pricing matches the live /challenges page exactly.
 */

import type { ChallengeProduct, ChallengeRules } from "@/lib/types/challenge";

/**
 * Rules shared identically across every tier — "same fair rules,
 * same 80% profit split, every tier," per the live site's own copy.
 * Matches /trading-rules and /core-rules exactly: no daily drawdown,
 * only the Balance-Based Trailing Drawdown.
 */
export const CHALLENGE_RULES: ChallengeRules = {
  profit_target_percent: 10,
  max_drawdown_percent: 20,
  drawdown_type: "balance_based_trailing",
  profit_split_percent: 80,
  platform: "MT5",
  phases: 2,
  min_hold_time_minutes: 3,
  activity_requirement_days: 5,
};

export const CHALLENGE_PRODUCTS: ChallengeProduct[] = [
  {
    id: "challenge-200k",
    challenge_name: "N200,000 Challenge",
    account_size: 200000,
    challenge_fee: 8900,
    status: "active",
    is_popular: false,
  },
  {
    id: "challenge-300k",
    challenge_name: "N300,000 Challenge",
    account_size: 300000,
    challenge_fee: 13900,
    status: "active",
    is_popular: false,
  },
  {
    id: "challenge-500k",
    challenge_name: "N500,000 Challenge",
    account_size: 500000,
    challenge_fee: 22900,
    status: "active",
    is_popular: true,
  },
  {
    id: "challenge-700k",
    challenge_name: "N700,000 Challenge",
    account_size: 700000,
    challenge_fee: 27900,
    status: "active",
    is_popular: false,
  },
  {
    id: "challenge-800k",
    challenge_name: "N800,000 Challenge",
    account_size: 800000,
    challenge_fee: 34900,
    status: "active",
    is_popular: false,
  },
  {
    id: "challenge-1m",
    challenge_name: "N1,000,000 Challenge",
    account_size: 1000000,
    challenge_fee: null,
    status: "coming_soon",
    is_popular: false,
  },
  {
    id: "challenge-2m",
    challenge_name: "N2,000,000 Challenge",
    account_size: 2000000,
    challenge_fee: null,
    status: "coming_soon",
    is_popular: false,
  },
  {
    id: "challenge-3m",
    challenge_name: "N3,000,000 Challenge",
    account_size: 3000000,
    challenge_fee: null,
    status: "coming_soon",
    is_popular: false,
  },
];

/** Returns only challenges that can actually be purchased right now. */
export function getPurchasableChallenges(): ChallengeProduct[] {
  return CHALLENGE_PRODUCTS.filter((c) => c.status === "active" && c.challenge_fee !== null);
}

/** Looks up a single challenge by its id. Returns null if not found. */
export function getChallengeById(id: string): ChallengeProduct | null {
  return CHALLENGE_PRODUCTS.find((c) => c.id === id) ?? null;
}

/** Converts a Naira amount to kobo, the unit Paystack's API requires. */
export function nairaToKobo(nairaAmount: number): number {
  return Math.round(nairaAmount * 100);
}
