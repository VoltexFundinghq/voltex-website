import { requireAdmin } from "@/lib/auth/session";
import Link from "next/link";
import { LayoutDashboard, Users, Receipt, Activity, CheckCircle2, XCircle, Trophy, Package } from "lucide-react";

const navItems = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Purchases", href: "/admin/purchases", icon: Receipt },
  { label: "Active Traders", href: "/admin/traders/active", icon: Activity },
  { label: "Passed Traders", href: "/admin/traders/passed", icon: CheckCircle2 },
  { label: "Failed Traders", href: "/admin/traders/failed", icon: XCircle },
  { label: "Funded Traders", href: "/admin/traders/funded", icon: Trophy },
  { label: "Inventory", href: "/admin/inventory", icon: Package },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="w-60 flex-shrink-0 border-r border-[#D4AF37]/15 bg-[#0a0a0a] px-4 py-6">
        <div className="mb-8 px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">Voltex Funding</p>
          <p className="mt-0.5 text-sm text-zinc-500">Admin</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
