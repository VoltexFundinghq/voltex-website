import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDashboardSummary, getCurrentChallengeCard, getMyRecentActivity } from "@/lib/database/customer-dashboard";
import CustomerHeader from "@/components/customer/CustomerHeader";
import Link from "next/link";

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "gold" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className={`mt-1.5 text-lg font-bold ${tone === "gold" ? "text-[#D4AF37]" : "text-white"}`}>{value}</p>
    </div>
  );
}

function ProgressBar({ label, percent, tone }: { label: string; percent: number; tone: "gold" | "danger" }) {
  const barColor = tone === "danger" ? (percent < 30 ? "bg-red-400" : percent < 60 ? "bg-amber-400" : "bg-emerald-400") : "bg-[#D4AF37]";
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-zinc-500"><span>{label}</span><span>{percent}%</span></div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div>
    </div>
  );
}

export default async function TraderDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [summary, current, activity] = await Promise.all([
    getDashboardSummary(user.id),
    getCurrentChallengeCard(user.id),
    getMyRecentActivity(user.id),
  ]);

  return (
    <div>
      <CustomerHeader title="Dashboard" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Active Challenge" value={summary.challengeLabel} tone="gold" />
          <StatCard label="Current Phase" value={summary.currentPhase !== null ? (summary.currentPhase === 3 ? "Funded" : `Phase ${summary.currentPhase}`) : "—"} />
          <StatCard label="Trading Account" value={summary.accountLogin ?? "—"} />
          <StatCard label="Current Equity" value={fmtMoney(summary.currentEquity)} />
          <StatCard label="Profit Target" value={`${summary.profitTargetProgressPercent}%`} tone="gold" />
          <StatCard label="Drawdown Remaining" value={`${summary.overallDrawdownRemainingPercent}%`} />
        </div>

        {!current ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-zinc-400">You don't have an active challenge right now.</p>
            <Link href="/challenges" className="mt-4 inline-block rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#F5D573]">Browse Challenges</Link>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">{fmtMoney(current.challengeSize)} Challenge — {current.status}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Purchased {fmtDate(current.purchaseDate)} · Trading started {fmtDate(current.tradingStarted)}</p>
              </div>
              <div className="flex gap-2">
                <Link href="/dashboard/trading-accounts" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">View Trading Account</Link>
                <Link href="/trading-rules" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">View Rules</Link>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div><p className="text-xs text-zinc-500">Balance</p><p className="mt-1 text-zinc-200">{fmtMoney(current.balance)}</p></div>
              <div><p className="text-xs text-zinc-500">Equity</p><p className="mt-1 text-zinc-200">{fmtMoney(current.equity)}</p></div>
              <div><p className="text-xs text-zinc-500">Profit</p><p className={`mt-1 ${current.profit !== null && current.profit < 0 ? "text-red-400" : "text-emerald-400"}`}>{fmtMoney(current.profit)} ({current.profitPercent}%)</p></div>
              <div><p className="text-xs text-zinc-500">Max Drawdown</p><p className="mt-1 text-zinc-200">{current.maxDrawdownPercent}%</p></div>
            </div>

            <div className="mt-6 space-y-4">
              <ProgressBar label={`Profit Target (${current.profitTargetPercent}%)`} percent={current.profitTargetProgressPercent} tone="gold" />
              <ProgressBar label="Overall Drawdown Remaining" percent={current.overallDrawdownRemainingPercent} tone="danger" />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="mt-4 text-center text-sm text-zinc-600">No activity yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {activity.map((e, i) => (
                <div key={i} className="border-b border-white/5 pb-2 last:border-0">
                  <p className="text-sm text-zinc-300">{e.text}</p>
                  <p className="text-xs text-zinc-600">{timeAgo(e.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
