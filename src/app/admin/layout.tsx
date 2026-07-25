import { requireAdmin } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  LayoutDashboard, Users, Receipt, Activity, CheckCircle2, XCircle, Trophy,
  Package, ListChecks, Server, CreditCard, TrendingUp, ArrowLeftRight, Banknote,
  ShieldAlert, Eye, FileText, Building2, Mail, Settings, UserCog,
} from "lucide-react";

async function getBadgeCounts() {
  const serviceClient = createServiceClient();
  const [payouts, reviews] = await Promise.all([
    serviceClient.from("payout_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    serviceClient.from("correlation_flags").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
  ]);
  return {
    payoutRequests: payouts.count ?? 0,
    manualReviews: reviews.count ?? 0,
  };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const badges = await getBadgeCounts();

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
        { label: "Payout Requests", href: "/admin/finance/payout-requests", icon: Banknote, badge: badges.payoutRequests },
      ],
    },
    {
      label: "Risk",
      items: [
        { label: "Rule Violations", href: "/admin/risk/violations", icon: ShieldAlert },
        { label: "Manual Reviews", href: "/admin/risk/reviews", icon: Eye, badge: badges.manualReviews },
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

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar navGroups={navGroups} />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
