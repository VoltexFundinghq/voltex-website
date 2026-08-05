import { getTicketStats, getAdminTicketsPage } from "@/lib/database/support-tickets";
import AdminHeader from "@/components/admin/AdminHeader";
import SupportTicketsTable from "@/components/admin/SupportTicketsTable";
import { Inbox, Clock, CheckCircle2, Calendar } from "lucide-react";

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "success" | "gold" }) {
  const toneClass = tone === "success" ? "text-emerald-400" : tone === "gold" ? "text-[#D4AF37]" : "text-white";
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

export default async function AdminSupportPage() {
  const [stats, initial] = await Promise.all([getTicketStats(), getAdminTicketsPage({ page: 1, pageSize: 20 })]);

  return (
    <div>
      <AdminHeader title="Support" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Open" value={String(stats.open)} icon={Inbox} tone="gold" />
          <StatCard label="Pending" value={String(stats.pending)} icon={Clock} />
          <StatCard label="Resolved" value={String(stats.resolved)} icon={CheckCircle2} tone="success" />
          <StatCard label="Today" value={String(stats.totalToday)} icon={Calendar} />
        </div>

        <SupportTicketsTable initialTickets={initial.tickets} initialTotalCount={initial.totalCount} />
      </div>
    </div>
  );
}
