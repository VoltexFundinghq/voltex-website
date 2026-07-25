import { createServiceClient } from "@/lib/supabase/service";

interface InventoryRow {
  account_size: number;
  status: string;
}

async function getInventorySummary(): Promise<Map<number, Map<string, number>>> {
  const serviceClient = createServiceClient();
  const query = await serviceClient
    .from("trading_accounts")
    .select("account_size, status");

  const rows = query.data as InventoryRow[] | null;
  const summary = new Map<number, Map<string, number>>();
  if (query.error || !rows) {
    console.error("getInventorySummary failed:", query.error);
    return summary;
  }

  for (const row of rows) {
    if (row.account_size === null) continue;
    if (!summary.has(row.account_size)) {
      summary.set(row.account_size, new Map());
    }
    const bySize = summary.get(row.account_size)!;
    bySize.set(row.status, (bySize.get(row.status) ?? 0) + 1);
  }

  return summary;
}

const STATUS_COLUMNS = ["available", "reserved", "assigned", "resetting", "expired"];

export default async function InventoryPage() {
  const summary = await getInventorySummary();
  const sizes = [...summary.keys()].sort((a, b) => a - b);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <p className="mt-1 text-sm text-zinc-500">Trading account stock by size and status</p>
      </div>

      {sizes.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No trading accounts in inventory yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Account Size</th>
                {STATUS_COLUMNS.map((s) => (
                  <th key={s} className="px-4 py-3 font-medium text-right capitalize">{s}</th>
                ))}
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((size) => {
                const bySize = summary.get(size)!;
                const total = [...bySize.values()].reduce((sum, n) => sum + n, 0);
                const availableCount = bySize.get("available") ?? 0;
                return (
                  <tr key={size} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-zinc-300">₦{size.toLocaleString()}</td>
                    {STATUS_COLUMNS.map((s) => (
                      <td key={s} className={`px-4 py-3 text-right font-mono ${s === "available" && availableCount === 0 ? "text-red-400" : "text-zinc-400"}`}>
                        {bySize.get(s) ?? 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-mono font-medium text-white">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
