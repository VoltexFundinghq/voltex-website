import { createServiceClient } from "@/lib/supabase/service";

export interface AdminTraderRow {
  id: string;
  user_id: string;
  user_email: string;
  status: string;
  current_phase: number;
  account_login: string | null;
  account_size: number | null;
  peak_closed_balance: number | null;
  last_known_balance: number | null;
  last_known_equity: number | null;
  last_known_check_at: string | null;
  hold_time_warnings_notified: number;
  drawdown_warning_sent: boolean;
  weekend_hold_warnings: number;
  payout_eligible: boolean;
  created_at: string;
}

interface RawChallengeRow {
  id: string;
  user_id: string;
  status: string;
  current_phase: number;
  account_login: string | null;
  trading_account_id: string | null;
  peak_closed_balance: number | null;
  last_known_balance: number | null;
  last_known_equity: number | null;
  last_known_check_at: string | null;
  hold_time_warnings_notified: number;
  drawdown_warning_sent: boolean;
  weekend_hold_warnings: number | null;
  payout_eligible: boolean | null;
  created_at: string;
}

/**
 * Fetches traders by challenge status, joined with real email and
 * account size — done as SEPARATE queries merged in code, rather than
 * Supabase's automatic relationship-embedding, since that requires a
 * declared foreign key PostgREST can detect, which doesn't exist
 * between user_challenges and public.users in our current schema.
 */
export async function getTradersByStatus(status: string): Promise<AdminTraderRow[]> {
  const serviceClient = createServiceClient();

  const challengesQuery = await serviceClient
    .from("user_challenges")
    .select(`
      id, user_id, status, current_phase, account_login, trading_account_id,
      peak_closed_balance, last_known_balance, last_known_equity, last_known_check_at,
      hold_time_warnings_notified, drawdown_warning_sent, weekend_hold_warnings, payout_eligible,
      created_at
    `)
    .eq("status", status)
    .order("created_at", { ascending: false });

  const challenges = challengesQuery.data as RawChallengeRow[] | null;
  if (challengesQuery.error || !challenges || challenges.length === 0) {
    if (challengesQuery.error) console.error("getTradersByStatus failed:", challengesQuery.error);
    return [];
  }

  const userIds = [...new Set(challenges.map((c) => c.user_id))];
  const accountIds = [...new Set(challenges.map((c) => c.trading_account_id).filter((id): id is string => !!id))];

  const [usersQuery, accountsQuery] = await Promise.all([
    serviceClient.from("users").select("id, email").in("id", userIds),
    accountIds.length > 0
      ? serviceClient.from("trading_accounts").select("id, account_size").in("id", accountIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const usersById = new Map((usersQuery.data as { id: string; email: string }[] | null ?? []).map((u) => [u.id, u.email]));
  const accountsById = new Map((accountsQuery.data as { id: string; account_size: number }[] | null ?? []).map((a) => [a.id, a.account_size]));

  return challenges.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    user_email: usersById.get(c.user_id) ?? "unknown",
    status: c.status,
    current_phase: c.current_phase,
    account_login: c.account_login,
    account_size: c.trading_account_id ? accountsById.get(c.trading_account_id) ?? null : null,
    peak_closed_balance: c.peak_closed_balance,
    last_known_balance: c.last_known_balance,
    last_known_equity: c.last_known_equity,
    last_known_check_at: c.last_known_check_at,
    hold_time_warnings_notified: c.hold_time_warnings_notified,
    drawdown_warning_sent: c.drawdown_warning_sent,
    weekend_hold_warnings: c.weekend_hold_warnings ?? 0,
    payout_eligible: c.payout_eligible ?? false,
    created_at: c.created_at,
  }));
}
