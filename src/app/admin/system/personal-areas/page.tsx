import { getPaStats, getPaCards, getAutomationInfo } from "@/lib/database/admin-personal-areas";
import AdminHeader from "@/components/admin/AdminHeader";
import PersonalAreasGrid from "@/components/admin/PersonalAreasGrid";
import { Building2, Package, CheckCircle2, Activity, Archive, Gauge } from "lucide-react";

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

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default async function PersonalAreasPage() {
  const [stats, cards, automation] = await Promise.all([getPaStats(), getPaCards(), getAutomationInfo()]);
  const lowCapacityPAs = cards.filter((c) => c.isLowCapacity);

  return (
    <div>
      <AdminHeader title="Personal Areas" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total PAs" value={String(stats.totalPAs)} icon={Building2} tone="gold" />
          <StatCard label="Total Accounts" value={String(stats.totalAccounts)} icon={Package} />
          <StatCard label="Available" value={String(stats.available)} icon={CheckCircle2} tone="success" />
          <StatCard label="Assigned" value={String(stats.assigned)} icon={Activity} />
          <StatCard label="Retired" value={String(stats.retired)} icon={Archive} />
          <StatCard label="Avg. Capacity" value={`${stats.avgCapacityPercent}%`} icon={Gauge} />
        </div>

        {lowCapacityPAs.length > 0 && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4">
            <p className="text-sm font-medium text-red-400">⚠ Low Capacity Alerts</p>
            {lowCapacityPAs.map((pa) => (
              <p key={pa.id} className="mt-1 text-xs text-zinc-400">PA {pa.label} is running low — only {pa.available} available accounts remain.</p>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Automation Information</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <div><p className="text-xs text-zinc-500">Provisioning Engine</p><p className="mt-1 text-emerald-400">Connected</p></div>
            <div><p className="text-xs text-zinc-500">Python Provisioning Service</p><p className={`mt-1 ${automation.pythonServiceRunning ? "text-emerald-400" : "text-red-400"}`}>{automation.pythonServiceRunning ? "Running" : "Not reporting"}</p></div>
            <div><p className="text-xs text-zinc-500">Last Inventory Scan</p><p className="mt-1 text-zinc-200">{timeAgo(automation.lastInventoryScan)}</p></div>
            <div><p className="text-xs text-zinc-500">Accounts Available</p><p className="mt-1 text-zinc-200">{automation.accountsAvailable}</p></div>
            <div><p className="text-xs text-zinc-500">Assigned Today</p><p className="mt-1 text-zinc-200">{automation.accountsAssignedToday}</p></div>
            <div><p className="text-xs text-zinc-500">Provision Success Rate</p><p className="mt-1 text-zinc-200">{automation.provisionSuccessRatePercent}%</p></div>
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-xs font-medium text-[#D4AF37]">Automatic Account Selection: Enabled</p>
            <p className="mt-1 text-xs text-zinc-500">The provisioning engine automatically selects the first available account matching the required challenge size. No manual assignment is required.</p>
          </div>
        </div>

        <PersonalAreasGrid initialCards={cards} />
      </div>
    </div>
  );
}
