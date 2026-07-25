import { getTradersByStatus } from "@/lib/database/admin-queries";

export default async function FailedTradersPage() {
  const traders = await getTradersByStatus("failed");

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Failed Traders</h1>
        <p className="mt-1 text-sm text-zinc-500">{traders.length} challenge{traders.length === 1 ? "" : "s"} that failed — accounts retired, never reused</p>
      </div>

      {traders.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No failed challenges yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Trader</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Phase Reached</th>
                <th className="px-4 py-3 font-medium text-right">Account Size</th>
                <th className="px-4 py-3 font-medium text-right">Final Balance</th>
                <th className="px-4 py-3 font-medium">Failed On</th>
              </tr>
            </thead>
            <tbody>
              {traders.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-300">{t.user_email}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">{t.account_login ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400">
                      Phase {t.current_phase}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">
                    {t.account_size !== null ? `₦${t.account_size.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {t.last_known_balance !== null ? `₦${t.last_known_balance.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {new Date(t.created_at).toLocaleDateString()}
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
