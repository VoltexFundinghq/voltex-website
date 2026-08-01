import { syncAuditEvents, getAuditStats, getAuditEventsPage, getAuditCharts } from "@/lib/database/admin-audit-logs";
import AdminHeader from "@/components/admin/AdminHeader";
import AuditCharts from "@/components/admin/AuditCharts";
import AuditLogsTable from "@/components/admin/AuditLogsTable";
import { FileText, Calendar, UserCog, Cpu, XCircle, Shield } from "lucide-react";

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

export default async function AuditLogsPage() {
  await syncAuditEvents();

  const [stats, initial, charts] = await Promise.all([
    getAuditStats(),
    getAuditEventsPage({ page: 1, pageSize: 25 }),
    getAuditCharts(),
  ]);

  return (
    <div>
      <AdminHeader title="Audit Logs" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Events" value={String(stats.totalEvents)} icon={FileText} tone="gold" />
          <StatCard label="Today" value={String(stats.today)} icon={Calendar} />
          <StatCard label="Admin Actions" value={String(stats.adminActions)} icon={UserCog} />
          <StatCard label="System Events" value={String(stats.systemEvents)} icon={Cpu} />
          <StatCard label="Failed Events" value={String(stats.failedEvents)} icon={XCircle} tone={stats.failedEvents > 0 ? "danger" : undefined} />
          <StatCard label="Security Events" value={String(stats.securityEvents)} icon={Shield} />
        </div>

        <AuditLogsTable initialEvents={initial.events} initialTotalCount={initial.totalCount} />

        <AuditCharts data={charts} />
      </div>
    </div>
  );
}
