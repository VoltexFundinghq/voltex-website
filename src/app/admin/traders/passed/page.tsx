import { getPassedTraderStats, getPassedTradersPage, getQueueInsights } from "@/lib/database/admin-passed-traders";
import AdminHeader from "@/components/admin/AdminHeader";
import PassedTradersTable from "@/components/admin/PassedTradersTable";
import { CheckCircle2, AlertTriangle, Trophy, Package, Clock } from "lucide-react";

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-emerald-400" : tone === "danger" ? "text-red-400" : tone === "gold" ? "text-[#D4AF37]" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-600" strokeWidth={1.75} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function fmtDuration(seconds: number): string {
  if (seconds < 5) return "Instant";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export default async function PassedTradersPage() {
  const [stats, initial, insights] = await Promise.all([
    getPassedTraderStats(),
    getPassedTradersPage({ page: 1, pageSize: 20 }),
    getQueueInsights(),
  ]);

  return (
    <div>
      <AdminHeader title="Passed Traders" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Passed" value={String(stats.totalPassed)} icon={CheckCircle2} tone="success" />
          <StatCard label="Awaiting Funding" value={String(stats.stuckNeedsFunding)} icon={AlertTriangle} tone="danger" />
          <StatCard label="Funded Today" value={String(stats.fundedToday)} icon={Trophy} tone="gold" />
          <StatCard label="Ready Accounts Available" value={String(stats.readyAccountsAvailable)} icon={Package} />
          <StatCard label="Avg. Time Waiting" value={fmtDuration(stats.avgWaitSeconds)} icon={Clock} />
        </div>

        {stats.stuckNeedsFunding > 0 && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4">
            <p className="text-sm font-medium text-red-400">⚠ Needs Attention</p>
            <p className="mt-1 text-xs text-zinc-400">{stats.stuckNeedsFunding} trader{stats.stuckNeedsFunding === 1 ? "" : "s"} passed evaluation but automatic funding failed (likely no inventory available at that moment) — needs manual funding.</p>
          </div>
        )}

        <PassedTradersTable initialTraders={initial.traders} initialTotalCount={initial.totalCount} />

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Queue Insights</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-zinc-500">Oldest Pending Trader</p>
              <p className="mt-1 text-zinc-200">{insights.oldestPendingEmail ?? "None"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Longest Waiting</p>
              <p className="mt-1 text-zinc-200">{insights.longestWaitingSeconds !== null ? fmtDuration(insights.longestWaitingSeconds) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Average Funding Delay</p>
              <p className="mt-1 text-zinc-200">{fmtDuration(insights.avgFundingDelaySeconds)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Funded Today</p>
              <p className="mt-1 text-zinc-200">{insights.fundedTodayCount}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Currently Stuck</p>
              <p className="mt-1 text-zinc-200">{insights.stuckCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
