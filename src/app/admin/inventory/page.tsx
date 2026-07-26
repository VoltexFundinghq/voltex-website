import { getInventoryStats, getInventoryPage, getInventoryMonitoring, getInventoryCharts } from "@/lib/database/admin-inventory";
import AdminHeader from "@/components/admin/AdminHeader";
import InventoryCharts from "@/components/admin/InventoryCharts";
import InventoryTable from "@/components/admin/InventoryTable";
import { Package, CheckCircle2, Activity, Trophy, Archive, Percent } from "lucide-react";

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

function timeAgoDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

export default async function InventoryPage() {
  const [stats, initial, monitoring, charts] = await Promise.all([
    getInventoryStats(),
    getInventoryPage({ page: 1, pageSize: 20 }),
    getInventoryMonitoring(),
    getInventoryCharts(),
  ]);

  return (
    <div>
      <AdminHeader title="Inventory" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Accounts" value={String(stats.totalAccounts)} icon={Package} tone="gold" />
          <StatCard label="Available" value={String(stats.available)} icon={CheckCircle2} tone="success" />
          <StatCard label="Assigned To Challenge" value={String(stats.assignedToChallenge)} icon={Activity} />
          <StatCard label="Assigned To Funded" value={String(stats.assignedToFunded)} icon={Trophy} tone="gold" />
          <StatCard label="Retired" value={String(stats.retired)} icon={Archive} />
          <StatCard label="Inventory Health" value={`${stats.healthPercent}%`} icon={Percent} tone={stats.healthPercent < 20 ? "danger" : "success"} />
        </div>

        <InventoryTable initialAccounts={initial.accounts} initialTotalCount={initial.totalCount} />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white">Inventory Monitoring</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-zinc-500">Available</p><p className="mt-1 text-xl font-bold text-emerald-400">{monitoring.available}</p></div>
              <div><p className="text-xs text-zinc-500">Low Inventory Sizes</p><p className="mt-1 text-zinc-200">{monitoring.lowInventorySizes.length === 0 ? "None" : monitoring.lowInventorySizes.map((s) => `₦${(s / 1000).toFixed(0)}k`).join(", ")}</p></div>
              <div><p className="text-xs text-zinc-500">Offline VPS</p><p className="mt-1 text-xl font-bold text-red-400">{monitoring.offlineVps}</p></div>
              <div><p className="text-xs text-zinc-500">Waiting Assignment</p><p className="mt-1 text-xl font-bold text-amber-400">{monitoring.waitingAssignment}</p></div>
              <div><p className="text-xs text-zinc-500">Waiting Exness Deletion</p><p className="mt-1 text-xl font-bold text-white">{monitoring.waitingDeletion}</p></div>
              <div><p className="text-xs text-zinc-500">Assignments This Month</p><p className="mt-1 text-xl font-bold text-white">{charts.assignmentsThisMonth}</p></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
              <div>
                <p className="mb-1.5 text-zinc-500">Newest Accounts</p>
                {monitoring.newestAccounts.map((a) => <p key={a.login} className="font-mono text-zinc-300">{a.login} · {timeAgoDate(a.createdAt)}</p>)}
              </div>
              <div>
                <p className="mb-1.5 text-zinc-500">Oldest Available</p>
                {monitoring.oldestAvailable.length === 0 ? <p className="text-zinc-600">None</p> : monitoring.oldestAvailable.map((a) => <p key={a.login} className="font-mono text-zinc-300">{a.login} · {timeAgoDate(a.createdAt)}</p>)}
              </div>
            </div>
          </div>

          <InventoryCharts data={charts} />
        </div>
      </div>
    </div>
  );
}
