/**
 * MT5 account provisioning — PHASE 2, NOT YET IMPLEMENTED.
 * Defines the contract for creating a real MT5 login once a challenge
 * purchase is confirmed, or once a trader passes a phase.
 */

import type { ChallengeType } from "@/lib/types/database";

export interface ProvisionAccountParams {
  userId: string;
  challengeSize: string;
  challengeType: ChallengeType;
}

export interface ProvisionAccountResult {
  mt5Login: string;
  investorPassword: string;
  masterPassword: string;
  server: string;
}

export async function provisionMt5Account(
  _params: ProvisionAccountParams
): Promise<ProvisionAccountResult> {
  throw new Error("provisionMt5Account is not implemented yet — Phase 2 (MT5 Account Provisioning).");
}
