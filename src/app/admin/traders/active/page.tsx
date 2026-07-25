import { getTradersByStatus } from "@/lib/database/admin-queries";
import { AlertTriangle, Clock } from "lucide-react";

function timeSince(dateStr: string | null): string {
  if (!dateStr) return "never";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function phaseLabel(phase: number): string {
  if (phase === 1) return "Phase 1";
  if (phase === 2) return "Phase 2";
  if (phase === 3) return "Funded";
  return `Phase ${phase}`;
}

export default async function ActiveTradersPage() {
  const traders = await getTradersByStatus("active");

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Active Traders</h1>
          <p className="mt-1 text-sm text-zinc-500">{traders.length} currently active challenge{traders.length === 1 ? "" : "s"}</p>
        </div>
      </div>

      {traders.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No active traders right now.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Trader</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Phase</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium text-right">Equity</th>
                <th className="px-4 py-3 font-medium text-right">Peak</th>
                <th className="px-4 py-3 font-medium">Warnings</th>
                <th className="px-4 py-3 font-medium">Last Check</th>
              </tr>
            </thead>
            <tbody>
              {traders.map((t) => {
                const isStale = !t.last_known_check_at || (Date.now() - new Date(t.last_known_check_at).getTime()) > 5 * 60 * 1000;
                const hasWarnings = t.hold_time_warnings_notified > 0 || t.drawdown_warning_sent || t.weekend_hold_warnings > 0;
                return (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-zinc-300">{t.user_email}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{t.account_login ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.current_phase === 3 ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "bg-white/5 text-zinc-300"}`}>
                        {phaseLabel(t.current_phase)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {t.last_known_balance !== null ? `₦${t.last_known_balance.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {t.last_known_equity !== null ? `₦${t.last_known_equity.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-500">
                      {t.peak_closed_balance !== null ? `₦${t.peak_closed_balance.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {hasWarnings ? (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {t.hold_time_warnings_notified > 0 && <span className="text-xs">HT:{t.hold_time_warnings_notified}/3</span>}
                          {t.drawdown_warning_sent && <span className="text-xs">DD</span>}
                          {t.weekend_hold_warnings > 0 && <span className="text-xs">WK:{t.weekend_hold_warnings}</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-600">none</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs ${isStale ? "text-red-400" : "text-zinc-500"}`}>
                        <Clock className="h-3 w-3" />
                        {timeSince(t.last_known_check_at)}
                      </span>
                    </td>
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
