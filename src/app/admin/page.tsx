import Link from "next/link";
import {
  getDashboardKPIs, getRevenueLast30Days, getRevenueBreakdown, getRecentPurchases, getRecentResults,
  getInventoryHealth, getSmartLoopStatus, getSystemHealth, getRecentActivity, getTodaysOperations,
} from "@/lib/database/admin-dashboard";
import DashboardHeader from "@/components/admin/DashboardHeader";
import RevenueChart from "@/components/admin/RevenueChart";
import {
  Users2, DollarSign, CreditCard, Clock, Package, Trophy,
  CheckCircle2, XCircle, Receipt, ShieldAlert, ListChecks, Users,
} from "lucide-react";

function KPICard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-emerald-400" : tone === "danger" ? "text-red-400" : tone === "gold" ? "text-[#D4AF37]" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-[#D4AF37]/25">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-600" strokeWidth={1.75} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-3 last:border-0">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="font-mono text-sm text-zinc-200">{value}</p>
    </div>
  );
}

function healthBadge(level: "healthy" | "low" | "critical") {
  if (level === "healthy") return { label: "Healthy", className: "bg-emerald-400/10 text-emerald-400", bar: "bg-emerald-400" };
  if (level === "low") return { label: "Low", className: "bg-[#D4AF37]/10 text-[#D4AF37]", bar: "bg-[#D4AF37]" };
  return { label: "Critical", className: "bg-red-400/10 text-red-400", bar: "bg-red-400" };
}

function statusBadge(status: "healthy" | "warning" | "offline" | "not_implemented") {
  if (status === "healthy") return { label: "Healthy", className: "bg-emerald-400/10 text-emerald-400" };
  if (status === "warning") return { label: "Warning", className: "bg-amber-400/10 text-amber-400" };
  if (status === "offline") return { label: "Offline", className: "bg-red-400/10 text-red-400" };
  return { label: "Not Implemented", className: "bg-white/5 text-zinc-500" };
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function purchaseStatusBadge(status: string) {
  if (status === "completed") return "bg-emerald-400/10 text-emerald-400";
  if (status === "failed") return "bg-red-400/10 text-red-400";
  if (status === "refunded") return "bg-white/5 text-zinc-400";
  return "bg-amber-400/10 text-amber-400";
}

export default async function AdminDashboardPage() {
  const [kpis, revenue, revenueBreakdown, purchases, results, inventory, smartLoop, systemHealth, activity, todaysOps] = await Promise.all([
    getDashboardKPIs(),
    getRevenueLast30Days(),
    getRevenueBreakdown(),
    getRecentPurchases(),
    getRecentResults(),
    getInventoryHealth(),
    getSmartLoopStatus(),
    getSystemHealth(),
    getRecentActivity(),
    getTodaysOperations(),
  ]);

  return (
    <div>
      <DashboardHeader />

      <div className="space-y-8 p-4 sm:p-8">

        {/* Section 2 — KPI Overview, reordered by operational priority */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KPICard label="Revenue Today" value={`₦${kpis.revenueToday.toLocaleString()}`} icon={DollarSign} tone="success" />
          <KPICard label="Pending Payments" value={String(kpis.pendingPayments)} icon={CreditCard} />
          <KPICard label="Pending Provisioning" value={String(kpis.pendingProvisioning)} icon={Clock} />
          <KPICard label="Active Traders" value={String(kpis.activeTraders)} icon={Users2} tone="gold" />
          <KPICard label="Available Inventory" value={String(kpis.availableInventory)} icon={Package} />
          <KPICard label="Funded Traders" value={String(kpis.fundedTraders)} icon={Trophy} tone="gold" />
        </div>

        {/* Section 10 — Today's Operations */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Today's Operations</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricRow label="Challenges Sold" value={String(todaysOps.challengesSold)} />
            <MetricRow label="Payments Received" value={String(todaysOps.paymentsReceived)} />
            <MetricRow label="Accounts Provisioned" value={String(todaysOps.accountsProvisioned)} />
            <MetricRow label="Accounts Reset" value="Not tracked yet" />
            <MetricRow label="Passed Today" value={String(todaysOps.passedToday)} />
            <MetricRow label="Failed Today" value={String(todaysOps.failedToday)} />
            <MetricRow label="Funded Today" value={String(todaysOps.fundedToday)} />
            <MetricRow label="Payout Requests" value={String(todaysOps.payoutRequestsToday)} />
          </div>
        </div>

        {/* Section 3 — Revenue Overview, 70/30 split */}
        <div className="grid gap-6 lg:grid-cols-10">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 lg:col-span-7">
            <h2 className="text-lg font-semibold text-white">Revenue — Last 30 Days</h2>
            <div className="mt-4">
              <RevenueChart data={revenue} />
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 lg:col-span-3">
            <h2 className="text-lg font-semibold text-white">Revenue Breakdown</h2>
            <div className="mt-4">
              <MetricRow label="Today" value={`₦${revenueBreakdown.today.toLocaleString()}`} />
              <MetricRow label="This Week" value={`₦${revenueBreakdown.thisWeek.toLocaleString()}`} />
              <MetricRow label="This Month" value={`₦${revenueBreakdown.thisMonth.toLocaleString()}`} />
              <MetricRow label="Avg. Purchase" value={`₦${Math.round(revenueBreakdown.avgPurchase).toLocaleString()}`} />
              <MetricRow label="Avg. Daily" value={`₦${Math.round(revenueBreakdown.avgDaily).toLocaleString()}`} />
            </div>
          </div>
        </div>

        {/* Section 4 & 5 — Challenge Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white">Recent Challenge Purchases</h2>
            {purchases.length === 0 ? (
              <p className="mt-6 text-center text-sm text-zinc-600">No activity yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {purchases.map((p) => (
                  <div key={p.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-300">{p.email}</p>
                      <p className="font-mono text-sm text-zinc-400">₦{p.price_paid.toLocaleString()}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600">
                      <span>{p.challenge_size}</span>
                      <span>·</span>
                      <span>{p.payment_method}</span>
                      <span>·</span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${purchaseStatusBadge(p.payment_status)}`}>{p.payment_status}</span>
                      <span>·</span>
                      <span>{timeAgo(p.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="text-lg font-semibold text-white">Recent Challenge Results</h2>
            {results.length === 0 ? (
              <p className="mt-6 text-center text-sm text-zinc-600">No activity yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {results.map((r) => {
                  const badge = r.outcome === "passed" ? "bg-emerald-400/10 text-emerald-400" : r.outcome === "funded" ? "bg-[#D4AF37]/10 text-[#D4AF37]" : "bg-red-400/10 text-red-400";
                  return (
                    <div key={r.id} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm text-zinc-300">{r.email}</p>
                        <p className="text-xs text-zinc-600">
                          {r.account_size ? `₦${r.account_size.toLocaleString()}` : "—"} · {timeAgo(r.created_at)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badge}`}>{r.outcome}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 6 — Inventory Health */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Inventory Health</h2>
          {inventory.length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-600">No activity yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {inventory.map((inv) => {
                const badge = healthBadge(inv.healthLevel);
                return (
                  <div key={inv.size} className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm text-zinc-300">₦{inv.size.toLocaleString()}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${badge.bar}`} style={{ width: `${inv.healthyPercent}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-600">{inv.healthyPercent}% available</p>
                    <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-zinc-500">
                      <span>Total: <span className="text-zinc-300">{inv.total}</span></span>
                      <span>Available: <span className="text-zinc-300">{inv.available}</span></span>
                      <span>Assigned: <span className="text-zinc-300">{inv.assigned}</span></span>
                      <span>Resetting: <span className="text-zinc-300">{inv.resetting}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 7 — Smart Loop Status */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Smart Loop Status</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-zinc-500">Provisioning Queue</p>
              <p className={`mt-1 text-sm font-medium ${smartLoop.queueHealthy ? "text-emerald-400" : "text-amber-400"}`}>
                {smartLoop.queueHealthy ? "Healthy" : `${smartLoop.waitingProvisioning} waiting`}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-zinc-500">Browser Worker</p>
              <p className="mt-1 text-sm text-zinc-500">Waiting for backend implementation</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-zinc-500">MetaAPI Connection</p>
              <p className="mt-1 text-sm text-zinc-500">Waiting for backend implementation</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-zinc-500">Inventory Status</p>
              <p className={`mt-1 text-sm font-medium ${smartLoop.inventoryHealthy ? "text-emerald-400" : "text-[#D4AF37]"}`}>
                {smartLoop.inventoryHealthy ? "Healthy" : `Low: ${smartLoop.lowInventorySizes.map((s) => `₦${(s / 1000).toFixed(0)}k`).join(", ")}`}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-zinc-500">Accounts Resetting</p>
              <p className="mt-1 text-xl font-bold text-white">{smartLoop.accountsResetting}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-zinc-500">Provision Retry Count</p>
              <p className="mt-1 text-sm text-zinc-500">Waiting for backend implementation</p>
            </div>
          </div>
        </div>

        {/* Section 8 — System Health */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">System Health</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemHealth.map((s) => {
              const badge = statusBadge(s.status);
              return (
                <div key={s.name} className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-300">{s.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">{s.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 9 — Recent Activity Timeline */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-600">No activity yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D4AF37]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-300">{a.type} <span className="text-zinc-500">— {a.description}</span></p>
                    <p className="text-xs text-zinc-600">{timeAgo(a.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions — kept from previous pass */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "View Users", href: "/admin/users", icon: Users },
              { label: "View Inventory", href: "/admin/inventory", icon: Package },
              { label: "View Payments", href: "/admin/finance/payments", icon: CreditCard },
              { label: "View Traders", href: "/admin/traders/active", icon: Users2 },
              { label: "Provision Queue", href: "/admin/operations/provisioning-queue", icon: ListChecks },
              { label: "Rule Violations", href: "/admin/risk/violations", icon: ShieldAlert },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-4 text-center transition-colors hover:border-[#D4AF37]/30 hover:bg-white/5"
                >
                  <Icon className="h-5 w-5 text-[#D4AF37]" strokeWidth={1.75} />
                  <span className="text-xs text-zinc-400">{action.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
