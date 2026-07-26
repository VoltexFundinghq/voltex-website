import { getFailedTraderStats, getFailedTradersPage, getDeletionMonitor, getFailureAnalytics } from "@/lib/database/admin-failed-traders";
import AdminHeader from "@/components/admin/AdminHeader";
import FailedTradersTable from "@/components/admin/FailedTradersTable";
import FailureCharts from "@/components/admin/FailureCharts";
import { XCircle, Calendar, Clock, Trash2, ShieldAlert } from "lucide-react";

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

export default async function FailedTradersPage() {
  const [stats, initial, deletionMonitor, analytics] = await Promise.all([
    getFailedTraderStats(),
    getFailedTradersPage({ page: 1, pageSize: 20 }),
    getDeletionMonitor(),
    getFailureAnalytics(),
  ]);

  return (
    <div>
      <AdminHeader title="Failed Traders" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Failed" value={String(stats.totalFailed)} icon={XCircle} tone="danger" />
          <StatCard label="Failed Today" value={String(stats.failedToday)} icon={Calendar} tone="danger" />
          <StatCard label="Failed This Week" value={String(stats.failedThisWeek)} icon={Calendar} />
          <StatCard label="Awaiting Deletion" value={String(stats.awaitingDeletion)} icon={Trash2} />
          <StatCard label="Avg. Days Until Deletion" value={String(stats.avgDaysUntilDeletion)} icon={Clock} />
          <StatCard label="Rule Violations Today" value={String(stats.ruleViolationsToday)} icon={ShieldAlert} tone="danger" />
        </div>

        <FailedTradersTable initialTraders={initial.traders} initialTotalCount={initial.totalCount} />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white">Deletion Monitor</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-zinc-500">Deleting Within 3 Days</p>
                <p className="mt-1 text-xl font-bold text-red-400">{deletionMonitor.within3Days}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Deleting Within 7 Days</p>
                <p className="mt-1 text-xl font-bold text-amber-400">{deletionMonitor.within7Days}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Oldest Retired</p>
                <p className="mt-1 text-zinc-200">{deletionMonitor.oldestRetiredLogin ? `${deletionMonitor.oldestRetiredLogin} (${deletionMonitor.oldestRetiredDays}d)` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Likely Already Deleted</p>
                <p className="mt-1 text-zinc-200">{deletionMonitor.alreadyLikelyDeleted}</p>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-zinc-600">Estimates based on our own records, not a live sync with Exness — logging in doesn't reset the real clock, only a genuine trade does.</p>
          </div>

          <FailureCharts data={analytics} />
        </div>
      </div>
    </div>
  );
}
