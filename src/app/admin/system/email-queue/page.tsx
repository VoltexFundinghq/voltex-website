import { getEmailStats, getEmailEventsPage } from "@/lib/database/admin-email-queue";
import AdminHeader from "@/components/admin/AdminHeader";
import EmailQueueTable from "@/components/admin/EmailQueueTable";
import { Mail, Calendar, Key, ShieldAlert } from "lucide-react";

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "gold" }) {
  const toneClass = tone === "gold" ? "text-[#D4AF37]" : "text-white";
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

export default async function EmailQueuePage() {
  const [stats, initial] = await Promise.all([getEmailStats(), getEmailEventsPage({ page: 1, pageSize: 25 })]);

  return (
    <div>
      <AdminHeader title="Email Queue" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="text-xs text-amber-400">This is a real log of every email our system attempted to send, inferred from actual send moments in our code — not a true delivery queue. We don't currently capture whether Resend confirmed delivery, so every entry shows as "Sent" without bounce or open tracking.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Sent" value={String(stats.totalSent)} icon={Mail} tone="gold" />
          <StatCard label="Today" value={String(stats.today)} icon={Calendar} />
          <StatCard label="Credential Emails" value={String(stats.credentialEmails)} icon={Key} />
          <StatCard label="Risk Alerts" value={String(stats.riskAlerts)} icon={ShieldAlert} />
        </div>

        <EmailQueueTable initialEvents={initial.events} initialTotalCount={initial.totalCount} />
      </div>
    </div>
  );
}
