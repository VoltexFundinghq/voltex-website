export type KycStatus = "pending" | "verified" | "rejected";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type ChallengeType = "phase_1" | "phase_2" | "funded";
export type AccountStatus = "active" | "passed" | "failed" | "breached";
export type PayoutStatus = "pending" | "approved" | "rejected" | "completed";

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  country: string | null;
  kyc_status: KycStatus;
  created_at: string;
}

export interface ChallengePurchase {
  id: string;
  user_id: string;
  challenge_size: string;
  price_paid: number;
  payment_reference: string | null;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface TradingAccount {
  id: string;
  user_id: string;
  mt5_login: string | null;
  investor_password: string | null;
  master_password: string | null;
  server: string | null;
  challenge_type: ChallengeType;
  balance: number;
  status: AccountStatus;
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
        Insert: Partial<TradingAccount> & { user_id: string };
        Update: Partial<TradingAccount>;
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
