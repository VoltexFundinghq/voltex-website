import { getFundedTraderStats, getFundedTradersPage, getLiveMonitoring, getFundedCharts } from "@/lib/database/admin-funded-traders";
import AdminHeader from "@/components/admin/AdminHeader";
import FundedTraderCharts from "@/components/admin/FundedTraderCharts";
import FundedTradersTable from "@/components/admin/FundedTradersTable";
import { Trophy, DollarSign, TrendingUp, AlertTriangle, Banknote, Percent } from "lucide-react";

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

export default async function FundedTradersPage() {
  const [stats, initial, liveMonitoring, chartData] = await Promise.all([
    getFundedTraderStats(),
    getFundedTradersPage({ page: 1, pageSize: 50 }),
    getLiveMonitoring(),
    getFundedCharts(),
  ]);

  return (
    <div>
      <AdminHeader title="Funded Traders" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Active Funded Traders" value={String(stats.activeFundedTraders)} icon={Trophy} tone="gold" />
          <StatCard label="Total Funded Capital" value={`₦${stats.totalFundedCapital.toLocaleString()}`} icon={DollarSign} tone="success" />
          <StatCard label="Currently Profitable" value={String(stats.currentlyProfitable)} icon={TrendingUp} tone="success" />
          <StatCard label="Near Max Drawdown" value={String(stats.nearMaxDrawdown)} icon={AlertTriangle} tone="danger" />
          <StatCard label="Pending Payout Requests" value={String(stats.pendingPayoutRequests)} icon={Banknote} />
          <StatCard label="Avg. Profit This Month" value={`${stats.avgProfitThisMonthPercent}%`} icon={Percent} tone="gold" />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Live Monitoring</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div><p className="text-xs text-zinc-500">Online</p><p className="mt-1 text-xl font-bold text-emerald-400">{liveMonitoring.onlineAccounts}</p></div>
            <div><p className="text-xs text-zinc-500">Offline</p><p className="mt-1 text-xl font-bold text-red-400">{liveMonitoring.offlineAccounts}</p></div>
            <div><p className="text-xs text-zinc-500">Delayed Heartbeats</p><p className="mt-1 text-xl font-bold text-amber-400">{liveMonitoring.delayedHeartbeats}</p></div>
            <div><p className="text-xs text-zinc-500">Near Max Drawdown</p><p className="mt-1 text-xl font-bold text-red-400">{liveMonitoring.nearMaxDrawdown}</p></div>
            <div><p className="text-xs text-zinc-500">Pending Payouts</p><p className="mt-1 text-xl font-bold text-white">{liveMonitoring.pendingPayouts}</p></div>
            <div><p className="text-xs text-zinc-500">Waiting Balance Reset</p><p className="mt-1 text-xl font-bold text-white">{liveMonitoring.waitingBalanceReset}</p></div>
          </div>
        </div>

        <FundedTradersTable initialTraders={initial.traders} initialTotalCount={initial.totalCount} />

        <FundedTraderCharts data={chartData} />
      </div>
    </div>
  );
}
