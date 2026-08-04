import { createServiceClient } from "@/lib/supabase/service";
import { createNotification } from "@/lib/database/notifications";
import { sendRuleEngineAlertEmail } from "@/lib/services/email/templates";

// Single, real, shared implementation for every payout action — used
// by both the Funded Traders page and the Payout Requests page, so
// there is exactly one real code path for approve/reject/mark-paid,
// not two drifting copies.

async function getTraderEmail(serviceClient: ReturnType<typeof createServiceClient>, userId: string): Promise<string | null> {
  const query = await serviceClient.from("users").select("email").eq("id", userId).single();
  return (query.data as { email: string } | null)?.email ?? null;
}

export async function approvePayoutRequest(payoutRequestId: string, adminEmail: string): Promise<{ success: boolean; error?: string }> {
  const serviceClient = createServiceClient();

  const payoutQuery = await serviceClient.from("payout_requests").select("id, user_id, amount, status").eq("id", payoutRequestId).single();
  const payout = payoutQuery.data as { id: string; user_id: string; amount: number; status: string } | null;
  if (!payout) return { success: false, error: "Payout request not found." };
  if (payout.status !== "pending") return { success: false, error: `Cannot approve a request already marked ${payout.status}.` };

  const { error } = await (serviceClient.from("payout_requests") as any)
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: adminEmail })
    .eq("id", payoutRequestId);
  if (error) return { success: false, error: "Failed to approve." };

  await createNotification({ userId: payout.user_id, title: "Payout Approved!", message: `Your payout request of ₦${Number(payout.amount).toLocaleString()} has been approved and is being processed.` });
  const email = await getTraderEmail(serviceClient, payout.user_id);
  if (email) await sendRuleEngineAlertEmail(email, { title: "Payout Approved!", message: `Your payout request of ₦${Number(payout.amount).toLocaleString()} has been approved and is being processed.` });

  return { success: true };
}

export async function rejectPayoutRequest(payoutRequestId: string, adminEmail: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  const serviceClient = createServiceClient();

  const payoutQuery = await serviceClient.from("payout_requests").select("id, user_id, amount, user_challenge_id, status").eq("id", payoutRequestId).single();
  const payout = payoutQuery.data as { id: string; user_id: string; amount: number; user_challenge_id: string; status: string } | null;
  if (!payout) return { success: false, error: "Payout request not found." };
  if (payout.status !== "pending") return { success: false, error: `Cannot reject a request already marked ${payout.status}.` };

  const { error } = await (serviceClient.from("payout_requests") as any)
    .update({ status: "rejected", rejected_by: adminEmail })
    .eq("id", payoutRequestId);
  if (error) return { success: false, error: "Failed to reject." };

  if (payout.user_challenge_id) {
    await (serviceClient.from("user_challenges") as any).update({ payout_eligible: false }).eq("id", payout.user_challenge_id);
  }

  const reasonText = reason ? ` Reason: ${reason}` : "";
  await createNotification({ userId: payout.user_id, title: "Payout Request Rejected", message: `Your payout request of ₦${Number(payout.amount).toLocaleString()} was rejected.${reasonText}` });
  const email = await getTraderEmail(serviceClient, payout.user_id);
  if (email) await sendRuleEngineAlertEmail(email, { title: "Payout Request Rejected", message: `Your payout request of ₦${Number(payout.amount).toLocaleString()} was rejected.${reasonText}` });

  return { success: true };
}

// "Paid" is a genuinely distinct real step from "Approved" — Approved
// means an admin confirmed the request is legitimate; Paid means the
// admin confirms money was actually sent (typically via manual bank
// transfer, since no automated payout channel exists). This does NOT
// automatically reset payout_eligible — that still only happens when
// our rule engine genuinely detects a new balance on Exness.
export async function markPayoutPaid(payoutRequestId: string, adminEmail: string): Promise<{ success: boolean; error?: string }> {
  const serviceClient = createServiceClient();

  const payoutQuery = await serviceClient.from("payout_requests").select("id, status").eq("id", payoutRequestId).single();
  const payout = payoutQuery.data as { id: string; status: string } | null;
  if (!payout) return { success: false, error: "Payout request not found." };
  if (payout.status !== "approved") return { success: false, error: "Only an already-approved request can be marked paid." };

  const { error } = await (serviceClient.from("payout_requests") as any)
    .update({ status: "completed", processed_at: new Date().toISOString(), paid_by: adminEmail })
    .eq("id", payoutRequestId);
  if (error) return { success: false, error: "Failed to mark paid." };

  return { success: true };
}
