# Voltex Funding — Backend Architecture

## Phase 1: Backend Foundation (COMPLETE)

### Step 1 — Supabase Configuration
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server client (Server Components/Actions)
- `src/lib/supabase/middleware.ts` — session refresh logic
- `src/proxy.ts` — root proxy file calling the above (Next.js 16 convention)
- `src/lib/auth/session.ts` — getUser, getSession, requireUser, signOut

### Step 2 — Authentication (tested end-to-end)
- `src/lib/auth/actions.ts` — signUp, signIn, signOutAction, forgotPassword, resetPassword
- `src/app/auth/callback/route.ts` — email confirmation + password reset callback
- `src/app/login/page.tsx`, `src/app/signup/page.tsx`, `src/app/forgot-password/page.tsx`, `src/app/reset-password/page.tsx`
- Email delivery: Resend SMTP connected via voltexfunding.com (see Supabase Auth SMTP settings)

### Step 3 — Database Schema (5 tables, all confirmed in Table Editor)
- `users` — profile data, auto-created via trigger on signup
- `challenge_purchases`
- `trading_accounts`
- `payout_requests`
- `notifications`

### Step 4 — Row Level Security
All five tables restrict access to `auth.uid() = user_id`. No table currently
allows user-initiated INSERT — all writes will come from trusted server-side
code (service role key) in Phase 2, once Paystack/MT5/admin actions exist.

### Steps 5–6 — Architecture & Types
- `src/lib/types/database.ts` — one interface per table, no `any`
- `src/lib/database/*.ts` — one query-helper file per table
  (`users.ts`, `challenges.ts`, `trading-accounts.ts`, `payouts.ts`, `notifications.ts`)

### Step 7 — Phase 2 Scaffold
- `src/lib/services/paystack.ts` — stub, throws "not implemented"
- `src/lib/services/mt5.ts` — stub, throws "not implemented"
- `src/lib/services/metaapi.ts` — stub, throws "not implemented"
- `src/lib/services/rule-engine.ts` — stub, throws "not implemented"
- `src/lib/services/email.ts` — stub, throws "not implemented"

## Phase 2 (NOT STARTED — reserved structure only)

| Feature | Planned location | Status |
|---|---|---|
| Paystack Integration | `src/lib/services/paystack.ts` | Stub only |
| MT5 Account Provisioning | `src/lib/services/mt5.ts` | Stub only |
| MetaApi Integration | `src/lib/services/metaapi.ts` | Stub only |
| Rule Engine | `src/lib/services/rule-engine.ts` | Stub only |
| Custom Transactional Emails | `src/lib/services/email.ts` | Stub only |
| Trader Dashboard | `src/app/dashboard/` (not yet created) | Not started |
| Admin Dashboard | `src/app/admin/` (not yet created) | Not started |

Each service file above defines the TypeScript interfaces/contracts Phase 2
will implement against, so the actual business logic can be written directly
into an existing, typed scaffold rather than starting from scratch.

## Phase 3 planning note (added after Phase 2 completion)

When MT5 account provisioning begins, add a new field (e.g. `order_status`
or `provisioning_status`) to `challenge_purchases`, separate from
`payment_status`. Purpose: the moment a payment is confirmed (webhook
sets `payment_status = 'completed'`), this new field should track whether
the corresponding trading account has actually been provisioned and sent
to the trader yet — so nothing gets missed between "payment received"
and "account actually delivered."

Natural place to trigger this: inside the webhook route
(`src/app/api/webhooks/palmpay/route.ts`), right where notifications are
currently created on successful payment — that's exactly the moment a
call to the (not-yet-built) MT5 provisioning service should fire too.

## Account lifecycle decisions (added during Phase 3 recycling discussion)

**MT5 trade history cannot be cleared** — confirmed as a deliberate,
platform-wide MetaQuotes design choice, not an Exness-specific
limitation. This means the "reset and reuse the same account for a
different customer" model does NOT work — old history remains
permanently visible to whoever logs in next, even after a balance
reset. (The default History tab view only shows a recent window,
which softens casual visibility, but the full history is always
retrievable via "All History".)

**Decided model going forward:**
- Phase 1 → Phase 2, same trader: KEEP the same trading_account_id.
  No history concern — it's the same person's own trading activity.
- Evaluation → Funded: trader receives a genuinely NEW account.
  This is the one real "handoff" moment requiring fresh inventory.
- Funded account persists long-term: the SAME funded account is
  reused across all of that trader's subsequent payout cycles — not
  swapped out per payout.
- An evaluation account that a trader FAILS on is retired permanently
  (`expired` status) — never reassigned to a different person.
  Replenishing stock means creating genuinely new Exness demo
  accounts and importing them via scripts/import-trading-accounts.js.

**Scaling accounts**: multiple Exness Personal Accounts can host
inventory in parallel as the business grows — trading_accounts
already treats this as one flat pool regardless of which PA an
account originates from. No schema change needed for this.

**Natural trigger point**: this logic belongs inside the Rule Engine,
specifically the moment it detects a trader has passed Phase 1
(keep same account, update user_challenges.status) or passed Phase 2
(provision a new funded account, update status to 'funded').

## Rules that cannot be automatically detected (added during Rule Engine build)

Four of Voltex Funding's published Prohibited Trading Practices cannot
be enforced by code with what currently exists — these remain real,
enforceable policy, just not something the Rule Engine can catch on
its own. If ever suspected, action requires manual investigation:

- **Arbitrage / Latency Exploitation** — would need a reference price
  feed to compare against broker quotes at the exact moment a trade
  fires. Closed-trade records alone can't reveal this.
- **Platform or Execution Abuse** — too broad a category to translate
  into a concrete, checkable signal without a much more specific
  definition of what qualifies.
- **Account Sharing** — would need login IP/device fingerprinting data
  we don't collect, and MT5 doesn't expose "who's at the keyboard" by
  design.

Copy Trading and Reverse Hedging ARE automatically detected (see
src/lib/services/rule-engine/detect-correlations.ts), but deliberately
flag for manual admin review rather than auto-failing an account —
false positives between unrelated traders on heavily-traded symbols
(EURUSD, XAUUSD) are a real, expected risk with this kind of detection.
