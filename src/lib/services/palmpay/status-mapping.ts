import type { PaymentStatus } from "@/lib/types/database";

/**
 * Maps PalmPay's 6-value orderStatus onto our own 4-value PaymentStatus.
 * Confirmed against PalmPay's official Data Dictionary:
 *   0 unpaid            -> pending (no change yet)
 *   1 paying             -> pending (no change yet)
 *   2 success  (final)   -> completed
 *   3 fail     (final)   -> failed
 *   4 close    (final)   -> failed (order expired unpaid — never became a real payment)
 *   5 required_capture   -> pending (card-only flow, not used by our bank-transfer checkout)
 */
export function mapPalmPayStatus(palmPayOrderStatus: number): PaymentStatus {
  switch (palmPayOrderStatus) {
    case 2:
      return "completed";
    case 3:
    case 4:
      return "failed";
    default:
      return "pending";
  }
}
