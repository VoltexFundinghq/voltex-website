import { getInventoryStats, getInventoryPage, getInventoryMonitoring, getInventoryCharts } from "@/lib/database/admin-inventory";
import AdminHeader from "@/components/admin/AdminHeader";
import InventoryCharts from "@/components/admin/InventoryCharts";
import InventoryTable from "@/components/admin/InventoryTable";
import { Package, CheckCircle2, Activity, Trophy, Archive, Gauge } from "lucide-react";

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

function HealthCard({ label, detail, level }: { label: string; detail: string; level: "healthy" | "low" | "critical" }) {
  const toneClass = level === "healthy" ? "text-emerald-400" : level === "low" ? "text-amber-400" : "text-red-400";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Inventory Health</p>
        <Gauge className="h-4 w-4 text-zinc-600" strokeWidth={1.75} />
      </div>
      <p className={`mt-2 text-lg font-bold ${toneClass}`}>{label}</p>
      <p className="text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function fmtDate(dateStr: string): string {
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
          <StatCard label="Assigned (Evaluation)" value={String(stats.assignedEvaluation)} icon={Activity} />
          <StatCard label="Assigned (Funded)" value={String(stats.assignedFunded)} icon={Trophy} tone="gold" />
          <StatCard label="Retired" value={String(stats.retired)} icon={Archive} />
          <HealthCard label={stats.healthLabel} detail={stats.healthDetail} level={stats.healthLevel} />
        </div>

        <InventoryTable initialAccounts={initial.accounts} initialTotalCount={initial.totalCount} />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white">Inventory Monitoring</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-zinc-500">Available</p><p className="mt-1 text-xl font-bold text-emerald-400">{monitoring.available}</p></div>
              <div><p className="text-xs text-zinc-500">Assigned (Evaluation)</p><p className="mt-1 text-xl font-bold text-white">{monitoring.assignedEvaluation}</p></div>
              <div><p className="text-xs text-zinc-500">Assigned (Funded)</p><p className="mt-1 text-xl font-bold text-[#D4AF37]">{monitoring.assignedFunded}</p></div>
              <div><p className="text-xs text-zinc-500">Retired</p><p className="mt-1 text-xl font-bold text-white">{monitoring.retired}</p></div>
              <div><p className="text-xs text-zinc-500">Awaiting VPS Connection</p><p className="mt-1 text-xl font-bold text-amber-400">{monitoring.awaitingVpsConnection}</p></div>
              <div><p className="text-xs text-zinc-500">Offline VPS</p><p className="mt-1 text-xl font-bold text-red-400">{monitoring.offlineVps}</p></div>
              <div className="col-span-2"><p className="text-xs text-zinc-500">Provision Queue Size</p><p className="mt-1 text-xl font-bold text-white">{monitoring.provisionQueueSize}</p></div>
            </div>
          </div>

          <InventoryCharts data={charts} />
        </div>
      </div>
    </div>
  );
}
