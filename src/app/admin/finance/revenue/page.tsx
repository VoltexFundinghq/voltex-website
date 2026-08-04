import { getRevenueSummary, getRevenueCharts, getRevenueLeaderboards, getRevenueForecast } from "@/lib/database/admin-revenue";
import AdminHeader from "@/components/admin/AdminHeader";
import RevenueCharts from "@/components/admin/RevenueCharts";
import RevenueLeaderboardCard from "@/components/admin/RevenueLeaderboardCard";
import { DollarSign, TrendingUp, Calendar, AlertTriangle, Download, FileText } from "lucide-react";

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

export default async function RevenuePage() {
  const [summary, charts, leaderboards, forecast] = await Promise.all([
    getRevenueSummary(),
    getRevenueCharts(),
    getRevenueLeaderboards(),
    getRevenueForecast(),
  ]);

  return (
    <div>
      <AdminHeader title="Revenue" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total Revenue" value={`₦${summary.totalRevenue.toLocaleString()}`} icon={DollarSign} tone="gold" />
          <StatCard label="Monthly Revenue" value={`₦${summary.monthlyRevenue.toLocaleString()}`} icon={Calendar} />
          <StatCard label="Yearly Revenue" value={`₦${summary.yearlyRevenue.toLocaleString()}`} icon={Calendar} />
          <StatCard label="Avg. Daily Revenue" value={`₦${summary.averageDailyRevenue.toLocaleString()}`} icon={TrendingUp} />
          <StatCard label="Avg. Order Value" value={`₦${summary.averageOrderValue.toLocaleString()}`} icon={DollarSign} />
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Gross Revenue" value={`₦${summary.grossRevenue.toLocaleString()}`} icon={DollarSign} />
          <StatCard label="Net Revenue" value={`₦${summary.netRevenue.toLocaleString()}`} icon={DollarSign} tone="success" />
          <StatCard label="Revenue Growth" value={`${summary.revenueGrowthPercent > 0 ? "+" : ""}${summary.revenueGrowthPercent}%`} icon={TrendingUp} tone={summary.revenueGrowthPercent >= 0 ? "success" : "danger"} />
          <StatCard label="Refund Rate" value={`${summary.refundRatePercent}%`} icon={AlertTriangle} />
        </div>
        {!summary.isRefundRateReal && (
          <p className="text-xs text-zinc-600">Refund Rate shows 0% because no refund has ever been processed through any real mechanism yet — an honest reading, not a bug.</p>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Revenue Forecast</h2>
          <p className="mt-1 text-xs text-zinc-500">
            A simple projection based on the last {forecast.basedOnDays} days' average daily revenue — not a sophisticated statistical model.
            {forecast.isLowConfidence && " Current sample size is small, so treat this as a rough estimate, not a reliable prediction."}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div><p className="text-xs text-zinc-500">Projected Monthly</p><p className="mt-1 text-xl font-bold text-white">₦{forecast.projectedMonthly.toLocaleString()}</p></div>
            <div><p className="text-xs text-zinc-500">Projected Annual</p><p className="mt-1 text-xl font-bold text-white">₦{forecast.projectedAnnual.toLocaleString()}</p></div>
          </div>
        </div>

        <RevenueCharts data={charts} />

        <RevenueLeaderboardCard leaderboards={leaderboards} />

        <div className="flex justify-end gap-2">
          <a href="/api/admin/revenue/export-pdf" download className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </a>
          <a href="/api/admin/revenue/export" download className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        </div>
      </div>
    </div>
  );
}
