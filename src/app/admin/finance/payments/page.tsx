import { getPaymentStats, getPaymentsPage, getGatewayBreakdown, getPaymentAnalytics } from "@/lib/database/admin-payments";
import AdminHeader from "@/components/admin/AdminHeader";
import PaymentsTable from "@/components/admin/PaymentsTable";
import RevenueChartCard from "@/components/admin/RevenueChartCard";
import { Receipt, DollarSign, Clock, CheckCircle2, XCircle, Undo2, Download } from "lucide-react";

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

export default async function PaymentsPage() {
  const [stats, initial, gateways, analytics] = await Promise.all([
    getPaymentStats(),
    getPaymentsPage({ page: 1, pageSize: 20 }),
    getGatewayBreakdown(),
    getPaymentAnalytics(),
  ]);

  return (
    <div>
      <AdminHeader title="Payments" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Payments Today" value={String(stats.totalToday)} icon={Receipt} tone="gold" />
          <StatCard label="Today's Revenue" value={`₦${stats.todaysRevenue.toLocaleString()}`} icon={DollarSign} tone="success" />
          <StatCard label="Pending" value={String(stats.pending)} icon={Clock} />
          <StatCard label="Successful" value={String(stats.successful)} icon={CheckCircle2} tone="success" />
          <StatCard label="Failed" value={String(stats.failed)} icon={XCircle} tone="danger" />
          <StatCard label="Refunded" value={String(stats.refunded)} icon={Undo2} />
        </div>

        <RevenueChartCard />

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Gateway Breakdown</h2>
          <p className="mt-1 text-xs text-zinc-500">We currently integrate exactly one payment gateway — not a fabricated multi-provider split.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {gateways.map((g) => (
              <div key={g.gateway} className="rounded-lg border border-white/10 bg-black/30 p-4">
                <p className="text-sm font-semibold text-white">{g.gateway}</p>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="text-zinc-500">Payments: <span className="text-zinc-200">{g.count}</span></p>
                  <p className="text-zinc-500">Revenue: <span className="text-zinc-200">₦{g.revenue.toLocaleString()}</span></p>
                  <p className="text-zinc-500">Success Rate: <span className="text-emerald-400">{g.successRatePercent}%</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Avg. Order Value" value={`₦${analytics.averageOrderValue.toLocaleString()}`} icon={DollarSign} />
          <StatCard label="Most Purchased" value={analytics.mostPurchasedChallenge} icon={Receipt} />
          <StatCard label="Conversion Rate" value={`${analytics.conversionRatePercent}%`} icon={CheckCircle2} tone="success" />
          <StatCard label="Failed Payment %" value={`${analytics.failedPaymentPercent}%`} icon={XCircle} tone={analytics.failedPaymentPercent > 20 ? "danger" : undefined} />
        </div>

        <div className="flex justify-end">
          <a href="/api/admin/payments/export" download className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        </div>

        <PaymentsTable initialPayments={initial.payments} initialTotalCount={initial.totalCount} />
      </div>
    </div>
  );
}
