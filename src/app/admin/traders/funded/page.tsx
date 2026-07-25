import { getTradersByStatus } from "@/lib/database/admin-queries";
import { AlertTriangle } from "lucide-react";

export default async function FundedTradersPage() {
  const traders = await getTradersByStatus("active");
  const fundedOnly = traders.filter((t) => t.current_phase === 3);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Funded Traders</h1>
        <p className="mt-1 text-sm text-zinc-500">{fundedOnly.length} trader{fundedOnly.length === 1 ? "" : "s"} currently on a funded account</p>
      </div>

      {fundedOnly.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No funded traders right now.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Trader</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium text-right">Account Size</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-right">Equity</th>
                <th className="px-4 py-3 font-medium">Payout Status</th>
              </tr>
            </thead>
            <tbody>
              {fundedOnly.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-zinc-300">{t.user_email}</td>
                  <td className="px-4 py-3 font-mono text-zinc-400">{t.account_login ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">
                    {t.account_size !== null ? `₦${t.account_size.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {t.last_known_balance !== null ? `₦${t.last_known_balance.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">
                    {t.last_known_equity !== null ? `₦${t.last_known_equity.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {t.payout_eligible ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#D4AF37]/10 px-2.5 py-1 text-xs font-medium text-[#D4AF37]">
                        <AlertTriangle className="h-3 w-3" />
                        Eligible — needs review
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">Not yet eligible</span>
                    )}
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
