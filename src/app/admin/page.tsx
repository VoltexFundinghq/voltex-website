import { getDashboardKPIs } from "@/lib/database/admin-dashboard";
import AdminHeader from "@/components/admin/AdminHeader";
import { Users2, DollarSign, Clock, Package, CheckCircle2, XCircle } from "lucide-react";

function KPICard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "success" | "danger" | "gold" }) {
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

export default async function AdminDashboardPage() {
  const kpis = await getDashboardKPIs();

  return (
    <div>
      <AdminHeader title="Dashboard" />
      <div className="p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KPICard label="Active Traders" value={String(kpis.activeTraders)} icon={Users2} tone="gold" />
          <KPICard label="Total Revenue" value={`₦${kpis.totalRevenue.toLocaleString()}`} icon={DollarSign} tone="success" />
          <KPICard label="Pending Provisioning" value={String(kpis.pendingProvisioning)} icon={Clock} />
          <KPICard label="Available Inventory" value={String(kpis.availableInventory)} icon={Package} />
          <KPICard label="Passed Challenges" value={String(kpis.passedChallenges)} icon={CheckCircle2} tone="success" />
          <KPICard label="Failed Challenges" value={String(kpis.failedChallenges)} icon={XCircle} tone="danger" />
        </div>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-sm text-zinc-500">Charts and recent activity feeds are coming in the next build pass.</p>
        </div>
      </div>
    </div>
  );
}
