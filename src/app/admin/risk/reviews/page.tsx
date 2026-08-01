import { syncManualReviews, getReviewStats, getReviewsPage, getReviewCharts } from "@/lib/database/admin-manual-reviews";
import AdminHeader from "@/components/admin/AdminHeader";
import ManualReviewCharts from "@/components/admin/ManualReviewCharts";
import ManualReviewsTable from "@/components/admin/ManualReviewsTable";
import { FolderOpen, AlertTriangle, UserCheck, CheckCircle2, Clock, TrendingUp } from "lucide-react";

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

export default async function ManualReviewsPage() {
  await syncManualReviews();

  const [stats, initial, charts] = await Promise.all([
    getReviewStats(),
    getReviewsPage({ page: 1, pageSize: 20 }),
    getReviewCharts(),
  ]);

  return (
    <div>
      <AdminHeader title="Manual Reviews" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Open Reviews" value={String(stats.openReviews)} icon={FolderOpen} tone={stats.openReviews > 0 ? "gold" : undefined} />
          <StatCard label="High Priority" value={String(stats.highPriority)} icon={AlertTriangle} tone={stats.highPriority > 0 ? "danger" : undefined} />
          <StatCard label="Assigned" value={String(stats.assigned)} icon={UserCheck} />
          <StatCard label="Completed Today" value={String(stats.completedToday)} icon={CheckCircle2} tone="success" />
          <StatCard label="Avg. Resolution" value={`${stats.avgResolutionHours}h`} icon={Clock} />
          <StatCard label="Escalated" value={String(stats.escalated)} icon={TrendingUp} tone={stats.escalated > 0 ? "danger" : undefined} />
        </div>

        <ManualReviewsTable initialReviews={initial.reviews} initialTotalCount={initial.totalCount} />

        <ManualReviewCharts data={charts} />
      </div>
    </div>
  );
}
