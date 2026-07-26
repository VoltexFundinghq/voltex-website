import { getActiveTraderStats, getActiveTradersPage, getActiveTraderCharts } from "@/lib/database/admin-active-traders";
import AdminHeader from "@/components/admin/AdminHeader";
import ActiveTraderCharts from "@/components/admin/ActiveTraderCharts";
import ActiveTradersTable from "@/components/admin/ActiveTradersTable";
import { Activity, Trophy, AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

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

export default async function ActiveTradersPage() {
  const [stats, initial, chartData] = await Promise.all([
    getActiveTraderStats(),
    getActiveTradersPage({ page: 1, pageSize: 20 }),
    getActiveTraderCharts(),
  ]);

  return (
    <div>
      <AdminHeader title="Active Traders" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Active Challenge Traders" value={String(stats.activeChallengeTraders)} icon={Activity} tone="gold" />
          <StatCard label="Funded Traders" value={String(stats.fundedTraders)} icon={Trophy} tone="gold" />
          <StatCard label="Near Breach" value={String(stats.nearBreach)} icon={AlertTriangle} tone="danger" />
          <StatCard label="In Profit" value={String(stats.inProfit)} icon={TrendingUp} tone="success" />
          <StatCard label="In Drawdown" value={String(stats.inDrawdown)} icon={TrendingDown} tone="danger" />
          <StatCard label="Awaiting Sync" value={String(stats.awaitingSync)} icon={RefreshCw} />
        </div>

        <ActiveTraderCharts data={chartData} />

        <ActiveTradersTable initialTraders={initial.traders} initialTotalCount={initial.totalCount} />
      </div>
    </div>
  );
}
