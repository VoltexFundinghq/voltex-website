import { getPurchaseStats, getPurchasesPage, getPurchaseRevenueLast30Days, getRecentPurchaseActivity } from "@/lib/database/admin-purchases";
import AdminHeader from "@/components/admin/AdminHeader";
import RevenueChart from "@/components/admin/RevenueChart";
import PurchasesTable from "@/components/admin/PurchasesTable";
import { Receipt, DollarSign, Clock, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

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

export default async function PurchasesPage() {
  const [stats, initial, revenue, activity] = await Promise.all([
    getPurchaseStats(),
    getPurchasesPage({ page: 1, pageSize: 20 }),
    getPurchaseRevenueLast30Days(),
    getRecentPurchaseActivity(),
  ]);

  const attentionCount = initial.purchases.filter((p) => p.needsAttention).length;

  return (
    <div>
      <AdminHeader title="Purchases" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Today's Purchases" value={String(stats.todaysPurchases)} icon={Receipt} tone="gold" />
          <StatCard label="Today's Revenue" value={`₦${stats.todaysRevenue.toLocaleString()}`} icon={DollarSign} tone="success" />
          <StatCard label="Pending" value={String(stats.pending)} icon={Clock} />
          <StatCard label="Successful" value={String(stats.successful)} icon={CheckCircle2} tone="success" />
          <StatCard label="Failed" value={String(stats.failed)} icon={XCircle} tone="danger" />
          <StatCard label="Refunded" value={String(stats.refunded)} icon={RotateCcw} />
        </div>

        {attentionCount > 0 && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4">
            <p className="text-sm font-medium text-red-400">⚠ Needs Attention</p>
            <p className="mt-1 text-xs text-zinc-400">{attentionCount} purchase{attentionCount === 1 ? "" : "s"} on this page have a failed payment or a provisioning error requiring review.</p>
          </div>
        )}

        <PurchasesTable initialPurchases={initial.purchases} initialTotalCount={initial.totalCount} />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white">Revenue — Last 30 Days</h2>
            <div className="mt-4">
              <RevenueChart data={revenue} />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            {activity.length === 0 ? (
              <p className="mt-6 text-center text-sm text-zinc-600">No activity yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {activity.map((event, i) => (
                  <div key={i} className="flex items-baseline gap-3 border-b border-white/5 pb-2 last:border-0">
                    <span className="w-14 flex-shrink-0 font-mono text-xs text-zinc-600">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-sm text-zinc-300">{event.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
