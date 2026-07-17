export type KycStatus = "pending" | "verified" | "rejected";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type TradingAccountStatus = "available" | "reserved" | "assigned" | "expired" | "resetting";
export type UserChallengeStatus = "pending_payment" | "awaiting_allocation" | "active" | "passed" | "failed" | "funded" | "archived";
export type PayoutStatus = "pending" | "approved" | "rejected" | "completed";

export interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  kyc_status: KycStatus;
  is_admin: boolean;
  created_at: string;
}

export interface ChallengePurchase {
  id: string;
  user_id: string;
  challenge_size: string;
  challenge_config_id: string | null;
  price_paid: number;
  payment_reference: string | null;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface TradingAccount {
  id: string;
  assigned_to: string | null;
  login: string | null;
  password: string | null;
  investor_password: string | null;
  server: string | null;
  broker: string | null;
  account_size: number | null;
  currency: string;
  status: TradingAccountStatus;
  created_at: string;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  trading_account_id: string | null;
  status: UserChallengeStatus;
  purchase_date: string;
  start_date: string | null;
  expiry_date: string | null;
  profit_target: number;
  drawdown_limit: number;
  profit_split: number;
  // Permanent historical snapshot — set once at allocation, never
  // changes again even after the underlying account is recycled.
  account_login: string | null;
  account_investor_password: string | null;
  account_server: string | null;
  account_broker: string | null;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  status: PayoutStatus;
  requested_at: string;
  processed_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserProfile;
        Insert: Partial<UserProfile> & { id: string; email: string };
        Update: Partial<UserProfile>;
      };
      challenge_purchases: {
        Row: ChallengePurchase;
        Insert: Partial<ChallengePurchase> & { user_id: string; challenge_size: string; price_paid: number };
        Update: Partial<ChallengePurchase>;
      };
      trading_accounts: {
        Row: TradingAccount;
        Insert: Partial<TradingAccount>;
        Update: Partial<TradingAccount>;
      };
      user_challenges: {
        Row: UserChallenge;
        Insert: Partial<UserChallenge> & { user_id: string; challenge_id: string; profit_target: number; drawdown_limit: number; profit_split: number };
        Update: Partial<UserChallenge>;
      };
      payout_requests: {
        Row: PayoutRequest;
        Insert: Partial<PayoutRequest> & { user_id: string; amount: number };
        Update: Partial<PayoutRequest>;
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; title: string; message: string };
        Update: Partial<Notification>;
      };
    };
  };
}
