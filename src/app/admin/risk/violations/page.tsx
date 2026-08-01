import { getViolationStats, getViolationsPage, getViolationCharts } from "@/lib/database/admin-rule-violations";
import AdminHeader from "@/components/admin/AdminHeader";
import ViolationCharts from "@/components/admin/ViolationCharts";
import ViolationsTable from "@/components/admin/ViolationsTable";
import { ShieldAlert, Calendar, TrendingDown, Eye } from "lucide-react";

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "danger" | "gold" }) {
  const toneClass = tone === "danger" ? "text-red-400" : tone === "gold" ? "text-[#D4AF37]" : "text-white";
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

export default async function RuleViolationsPage() {
  const [stats, initial, charts] = await Promise.all([
    getViolationStats(),
    getViolationsPage({ page: 1, pageSize: 20 }),
    getViolationCharts(),
  ]);

  return (
    <div>
      <AdminHeader title="Rule Violations" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Violations" value={String(stats.totalViolations)} icon={ShieldAlert} tone="danger" />
          <StatCard label="Today" value={String(stats.today)} icon={Calendar} />
          <StatCard label="Max Drawdown Breach" value={String(stats.maxDrawdownBreach)} icon={TrendingDown} tone="danger" />
          <StatCard label="Pending Review" value={String(stats.pendingReview)} icon={Eye} tone={stats.pendingReview > 0 ? "gold" : undefined} />
        </div>

        <ViolationsTable initialViolations={initial.violations} initialTotalCount={initial.totalCount} />

        <ViolationCharts data={charts} />
      </div>
    </div>
  );
}
