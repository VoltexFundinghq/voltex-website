import { getActiveTraderStats, getActiveTradersPage, getActiveTraderCharts, getActiveTraderActivityFeed } from "@/lib/database/admin-active-traders";
import AdminHeader from "@/components/admin/AdminHeader";
import ActiveTraderCharts from "@/components/admin/ActiveTraderCharts";
import ActiveTradersTable from "@/components/admin/ActiveTradersTable";
import { Activity, Trophy, AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";

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

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function ActiveTradersPage() {
  const [stats, initial, chartData, activityFeed] = await Promise.all([
    getActiveTraderStats(),
    getActiveTradersPage({ page: 1, pageSize: 50 }),
    getActiveTraderCharts(),
    getActiveTraderActivityFeed(),
  ]);

  return (
    <div>
      <AdminHeader title="Active Traders" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Active Challenge Accounts" value={String(stats.activeChallengeAccounts)} icon={Activity} tone="gold" />
          <StatCard label="Active Funded Accounts" value={String(stats.activeFundedAccounts)} icon={Trophy} tone="gold" />
          <StatCard label="Near Max Drawdown" value={String(stats.nearMaxDrawdown)} icon={AlertTriangle} tone="danger" />
          <StatCard label="Awaiting VPS Sync" value={String(stats.awaitingVpsSync)} icon={RefreshCw} />
          <StatCard label="In Profit" value={String(stats.inProfit)} icon={TrendingUp} tone="success" />
        </div>

        <ActiveTraderCharts data={chartData} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ActiveTradersTable initialTraders={initial.traders} initialTotalCount={initial.totalCount} />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            {activityFeed.length === 0 ? (
              <p className="mt-6 text-center text-sm text-zinc-600">No activity yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {activityFeed.map((event, i) => (
                  <div key={i} className="border-b border-white/5 pb-2 last:border-0">
                    <p className="text-sm text-zinc-300">{event.text}</p>
                    <p className="text-xs text-zinc-600">{timeAgo(event.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
