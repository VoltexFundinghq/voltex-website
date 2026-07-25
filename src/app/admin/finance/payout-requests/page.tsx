import { createServiceClient } from "@/lib/supabase/service";
import AdminHeader from "@/components/admin/AdminHeader";

interface PayoutRow {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

async function getPayoutRequests(): Promise<{ payouts: PayoutRow[]; emailsById: Map<string, string> }> {
  const serviceClient = createServiceClient();
  const payoutsQuery = await serviceClient
    .from("payout_requests")
    .select("id, user_id, amount, status, requested_at, processed_at")
    .order("requested_at", { ascending: false });

  const payouts = payoutsQuery.data as PayoutRow[] | null;
  if (payoutsQuery.error || !payouts) return { payouts: [], emailsById: new Map() };

  const userIds = [...new Set(payouts.map((p) => p.user_id))];
  const usersQuery = userIds.length > 0
    ? await serviceClient.from("users").select("id, email").in("id", userIds)
    : { data: [] as any[] };

  const emailsById = new Map((usersQuery.data as { id: string; email: string }[] ?? []).map((u) => [u.id, u.email]));

  return { payouts, emailsById };
}

function statusBadge(status: string) {
  if (status === "approved") return "bg-emerald-400/10 text-emerald-400";
  if (status === "rejected") return "bg-red-400/10 text-red-400";
  if (status === "completed") return "bg-[#D4AF37]/10 text-[#D4AF37]";
  return "bg-amber-400/10 text-amber-400";
}

export default async function PayoutRequestsPage() {
  const { payouts, emailsById } = await getPayoutRequests();

  return (
    <div>
      <AdminHeader title="Payout Requests" />
      <div className="p-8">
        <p className="mb-4 text-sm text-zinc-500">{payouts.length} request{payouts.length === 1 ? "" : "s"} recorded</p>

        {payouts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="text-zinc-500">No payout requests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium">Processed</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-zinc-300">{emailsById.get(p.user_id) ?? "unknown"}</td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">₦{Number(p.amount).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{new Date(p.requested_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{p.processed_at ? new Date(p.processed_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
