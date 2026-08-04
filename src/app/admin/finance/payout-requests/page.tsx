import { getPayoutStats, getPayoutRequestsPage, getPayoutAnalytics } from "@/lib/database/admin-payout-requests";
import AdminHeader from "@/components/admin/AdminHeader";
import PayoutRequestsTable from "@/components/admin/PayoutRequestsTable";
import { Clock, CheckCircle2, XCircle, Banknote, DollarSign, Calendar, Download, FileText } from "lucide-react";

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

export default async function PayoutRequestsPage() {
  const [stats, initial, analytics] = await Promise.all([
    getPayoutStats(),
    getPayoutRequestsPage({ page: 1, pageSize: 25 }),
    getPayoutAnalytics(),
  ]);

  return (
    <div>
      <AdminHeader title="Payout Requests" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Pending" value={String(stats.pending)} icon={Clock} tone={stats.pending > 0 ? "gold" : undefined} />
          <StatCard label="Approved" value={String(stats.approved)} icon={CheckCircle2} tone="success" />
          <StatCard label="Rejected" value={String(stats.rejected)} icon={XCircle} tone="danger" />
          <StatCard label="Paid" value={String(stats.paid)} icon={Banknote} />
          <StatCard label="Total Value" value={`₦${stats.totalValue.toLocaleString()}`} icon={DollarSign} />
          <StatCard label="Today's Requests" value={String(stats.todaysRequests)} icon={Calendar} />
        </div>

        <PayoutRequestsTable initialPayouts={initial.payouts} initialTotalCount={initial.totalCount} />

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Analytics</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
            <div><p className="text-xs text-zinc-500">Average Payout</p><p className="mt-1 text-zinc-200">₦{analytics.averagePayout.toLocaleString()}</p></div>
            <div><p className="text-xs text-zinc-500">Total Paid</p><p className="mt-1 text-zinc-200">₦{analytics.totalPaid.toLocaleString()}</p></div>
            <div><p className="text-xs text-zinc-500">Largest Payout</p><p className="mt-1 text-zinc-200">₦{analytics.largestPayout.toLocaleString()}</p></div>
            <div><p className="text-xs text-zinc-500">Pending Value</p><p className="mt-1 text-zinc-200">₦{analytics.pendingValue.toLocaleString()}</p></div>
            <div><p className="text-xs text-zinc-500">Avg. Processing Time</p><p className="mt-1 text-zinc-200">{analytics.averageProcessingHours}h</p></div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <a href="/api/admin/payout-requests/export-pdf" download className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </a>
          <a href="/api/admin/payout-requests/export" download className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        </div>
      </div>
    </div>
  );
}
