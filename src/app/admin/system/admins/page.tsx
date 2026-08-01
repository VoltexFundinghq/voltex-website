import { getAdminStats, getAdminsList } from "@/lib/database/admin-admins";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminsTable from "@/components/admin/AdminsTable";
import { Users2, Shield, Activity, LogIn, Mail, Ban } from "lucide-react";

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

export default async function AdminsPage() {
  const [stats, admins] = await Promise.all([getAdminStats(), getAdminsList({ filter: "all" })]);

  return (
    <div>
      <AdminHeader title="Admins" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Admins" value={String(stats.totalAdmins)} icon={Users2} tone="gold" />
          <StatCard label="Super Admins" value={String(stats.superAdmins)} icon={Shield} />
          <StatCard label="Active Sessions (approx.)" value={String(stats.activeSessionsApprox)} icon={Activity} />
          <StatCard label="Logged In Today" value={String(stats.lastLoginToday)} icon={LogIn} />
          <StatCard label="Pending Invitations" value={String(stats.pendingInvitations)} icon={Mail} />
          <StatCard label="Suspended" value={String(stats.suspendedAdmins)} icon={Ban} tone={stats.suspendedAdmins > 0 ? "danger" : undefined} />
        </div>

        <AdminsTable initialAdmins={admins} />
      </div>
    </div>
  );
}
