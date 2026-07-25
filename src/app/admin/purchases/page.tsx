import { createServiceClient } from "@/lib/supabase/service";

interface PurchaseRow {
  id: string;
  user_id: string;
  challenge_size: string;
  price_paid: number;
  payment_reference: string | null;
  payment_status: string;
  created_at: string;
}

async function getAllPurchases(): Promise<{ purchases: PurchaseRow[]; emailsById: Map<string, string> }> {
  const serviceClient = createServiceClient();
  const purchasesQuery = await serviceClient
    .from("challenge_purchases")
    .select("id, user_id, challenge_size, price_paid, payment_reference, payment_status, created_at")
    .order("created_at", { ascending: false });

  const purchases = purchasesQuery.data as PurchaseRow[] | null;
  if (purchasesQuery.error || !purchases) {
    console.error("getAllPurchases failed:", purchasesQuery.error);
    return { purchases: [], emailsById: new Map() };
  }

  const userIds = [...new Set(purchases.map((p) => p.user_id))];
  const usersQuery = userIds.length > 0
    ? await serviceClient.from("users").select("id, email").in("id", userIds)
    : { data: [] as any[] };

  const emailsById = new Map((usersQuery.data as { id: string; email: string }[] ?? []).map((u) => [u.id, u.email]));

  return { purchases, emailsById };
}

function statusBadge(status: string) {
  if (status === "completed") return "bg-emerald-400/10 text-emerald-400";
  if (status === "failed") return "bg-red-400/10 text-red-400";
  if (status === "refunded") return "bg-white/5 text-zinc-400";
  return "bg-amber-400/10 text-amber-400";
}

export default async function PurchasesPage() {
  const { purchases, emailsById } = await getAllPurchases();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Purchases</h1>
        <p className="mt-1 text-sm text-zinc-500">{purchases.length} purchase attempt{purchases.length === 1 ? "" : "s"}</p>
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No purchases yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Trader</th>
                <th className="px-4 py-3 font-medium">Challenge</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-300">{emailsById.get(p.user_id) ?? "unknown"}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.challenge_size}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">₦{p.price_paid.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadge(p.payment_status)}`}>
                      {p.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.payment_reference ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
