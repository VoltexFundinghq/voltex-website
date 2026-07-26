import { getQueueStats, getQueue, getQueueAnalytics } from "@/lib/database/admin-provisioning-queue";
import AdminHeader from "@/components/admin/AdminHeader";
import ProvisioningQueueTable from "@/components/admin/ProvisioningQueueTable";
import { Clock, RotateCw, CheckCircle2, XCircle, Timer, Package } from "lucide-react";

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
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

export default async function ProvisioningQueuePage() {
  const [stats, queue, analytics] = await Promise.all([
    getQueueStats(),
    getQueue(),
    getQueueAnalytics(),
  ]);

  return (
    <div>
      <AdminHeader title="Provisioning Queue" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Waiting Queue" value={String(stats.waitingCount)} icon={Clock} tone={stats.waitingCount > 0 ? "danger" : undefined} />
          <StatCard label="Completed Today" value={String(stats.completedToday)} icon={CheckCircle2} tone="success" />
          <StatCard label="Failed Today" value={String(stats.failedToday)} icon={XCircle} tone="danger" />
          <StatCard label="Avg. Provision Time" value={fmtDuration(stats.avgProvisionSeconds)} icon={Timer} />
          <StatCard label="Available Inventory" value={String(stats.availableInventory)} icon={Package} />
        </div>

        <ProvisioningQueueTable initialQueue={queue} />

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Queue Analytics</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
            <div><p className="text-xs text-zinc-500">Provision Time Today</p><p className="mt-1 text-zinc-200">{fmtDuration(analytics.provisionTimeToday)}</p></div>
            <div><p className="text-xs text-zinc-500">Success Rate</p><p className="mt-1 text-zinc-200">{analytics.successRatePercent}%</p></div>
            <div><p className="text-xs text-zinc-500">Avg. Queue Time</p><p className="mt-1 text-zinc-200">{fmtDuration(analytics.avgQueueTimeSeconds)}</p></div>
            <div><p className="text-xs text-zinc-500">Current Queue Length</p><p className="mt-1 text-zinc-200">{analytics.currentQueueLength}</p></div>
            <div><p className="text-xs text-zinc-500">Inventory Used Today</p><p className="mt-1 text-zinc-200">{analytics.inventoryUsedToday}</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
