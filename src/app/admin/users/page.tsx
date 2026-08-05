import { getUserSummaryStats, getUsersPage } from "@/lib/database/admin-users";
import AdminHeader from "@/components/admin/AdminHeader";
import UsersTable from "@/components/admin/UsersTable";
import AccessDeniedPanel from "@/components/admin/AccessDeniedPanel";
import { hasModuleAccess } from "@/lib/auth/check-page-access";
import { Users2, Activity, Ban, Trophy, Receipt, DollarSign } from "lucide-react";

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

export default async function UsersPage() {
  const hasAccess = await hasModuleAccess("Traders");

  if (!hasAccess) {
    return (
      <div>
        <AdminHeader title="Users" />
        <AccessDeniedPanel module="Traders" />
      </div>
    );
  }

  const [stats, initial] = await Promise.all([
    getUserSummaryStats(),
    getUsersPage({ page: 1, pageSize: 20 }),
  ]);

  return (
    <div>
      <AdminHeader title="Users" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Users" value={String(stats.totalUsers)} icon={Users2} tone="gold" />
          <StatCard label="Active Traders" value={String(stats.activeTraders)} icon={Activity} />
          <StatCard label="Suspended" value={String(stats.suspendedUsers)} icon={Ban} tone="danger" />
          <StatCard label="Funded Traders" value={String(stats.fundedTraders)} icon={Trophy} tone="gold" />
          <StatCard label="Total Purchases" value={String(stats.totalPurchases)} icon={Receipt} />
          <StatCard label="Total Revenue" value={`₦${stats.totalRevenue.toLocaleString()}`} icon={DollarSign} tone="success" />
        </div>

        <UsersTable initialUsers={initial.users} initialTotalCount={initial.totalCount} />
      </div>
    </div>
  );
}
