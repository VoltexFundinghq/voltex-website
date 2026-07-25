import { createServiceClient } from "@/lib/supabase/service";

interface AccountRow {
  pa_label: string | null;
  status: string;
}

async function getPersonalAreaSummary() {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("trading_accounts").select("pa_label, status");
  const rows = query.data as AccountRow[] | null;

  const summary = new Map<string, { total: number; available: number }>();
  if (query.error || !rows) return summary;

  for (const row of rows) {
    const label = row.pa_label ?? "Unlabeled";
    if (!summary.has(label)) summary.set(label, { total: 0, available: 0 });
    const entry = summary.get(label)!;
    entry.total += 1;
    if (row.status === "available") entry.available += 1;
  }

  return summary;
}

export default async function PersonalAreasPage() {
  const summary = await getPersonalAreaSummary();
  const labels = [...summary.keys()].sort();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Personal Areas</h1>
        <p className="mt-1 text-sm text-zinc-500">Inventory grouped by Exness PA</p>
      </div>

      {labels.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No trading accounts in inventory yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {labels.map((label) => {
            const entry = summary.get(label)!;
            const isLow = entry.available === 0;
            return (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <p className="font-mono text-sm text-zinc-300">PA {label}</p>
                <p className="mt-3 text-2xl font-bold text-white">{entry.total}</p>
                <p className="text-xs text-zinc-500">total accounts</p>
                <p className={`mt-2 text-sm ${isLow ? "text-red-400" : "text-emerald-400"}`}>
                  {entry.available} available
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
