import { requireAdmin } from "@/lib/auth/session";
import Link from "next/link";
import {
  LayoutDashboard, Users, Receipt, Activity, CheckCircle2, XCircle, Trophy,
  Package, ListChecks, Server, CreditCard, TrendingUp, ArrowLeftRight, Banknote,
  ShieldAlert, Eye, FileText, Building2, Mail, Settings, UserCog,
} from "lucide-react";

const navGroups = [
  {
    label: null,
    items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Traders",
    items: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Purchases", href: "/admin/purchases", icon: Receipt },
      { label: "Active Traders", href: "/admin/traders/active", icon: Activity },
      { label: "Passed Traders", href: "/admin/traders/passed", icon: CheckCircle2 },
      { label: "Failed Traders", href: "/admin/traders/failed", icon: XCircle },
      { label: "Funded Traders", href: "/admin/traders/funded", icon: Trophy },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Inventory", href: "/admin/inventory", icon: Package },
      { label: "Provisioning Queue", href: "/admin/operations/provisioning-queue", icon: ListChecks },
      { label: "VPS Monitoring", href: "/admin/operations/vps-monitoring", icon: Server },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", href: "/admin/finance/payments", icon: CreditCard },
      { label: "Revenue", href: "/admin/finance/revenue", icon: TrendingUp },
      { label: "Transactions", href: "/admin/finance/transactions", icon: ArrowLeftRight },
      { label: "Payout Requests", href: "/admin/finance/payout-requests", icon: Banknote },
    ],
  },
  {
    label: "Risk",
    items: [
      { label: "Rule Violations", href: "/admin/risk/violations", icon: ShieldAlert },
      { label: "Manual Reviews", href: "/admin/risk/reviews", icon: Eye },
      { label: "Audit Logs", href: "/admin/risk/audit-logs", icon: FileText },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Personal Areas", href: "/admin/system/personal-areas", icon: Building2 },
      { label: "Email Queue", href: "/admin/system/email-queue", icon: Mail },
      { label: "Admins", href: "/admin/system/admins", icon: UserCog },
      { label: "Settings", href: "/admin/system/settings", icon: Settings },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-[#D4AF37]/15 bg-[#0a0a0a] px-4 py-6">
        <div className="mb-6 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">Voltex Funding</p>
          <p className="mt-0.5 text-sm text-zinc-500">Operations Centre</p>
        </div>
        <nav className="space-y-5">
          {navGroups.map((group, i) => (
            <div key={i}>
              {group.label && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">{group.label}</p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
