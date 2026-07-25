import { requireAdmin } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import AdminSidebar from "@/components/admin/AdminSidebar";

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
      items: [{ label: "Dashboard", href: "/admin", iconName: "LayoutDashboard" as const }],
    },
    {
      label: "Traders",
      items: [
        { label: "Users", href: "/admin/users", iconName: "Users" as const },
        { label: "Purchases", href: "/admin/purchases", iconName: "Receipt" as const },
        { label: "Active Traders", href: "/admin/traders/active", iconName: "Activity" as const },
        { label: "Passed Traders", href: "/admin/traders/passed", iconName: "CheckCircle2" as const },
        { label: "Failed Traders", href: "/admin/traders/failed", iconName: "XCircle" as const },
        { label: "Funded Traders", href: "/admin/traders/funded", iconName: "Trophy" as const },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Inventory", href: "/admin/inventory", iconName: "Package" as const },
        { label: "Provisioning Queue", href: "/admin/operations/provisioning-queue", iconName: "ListChecks" as const },
        { label: "VPS Monitoring", href: "/admin/operations/vps-monitoring", iconName: "Server" as const },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Payments", href: "/admin/finance/payments", iconName: "CreditCard" as const },
        { label: "Revenue", href: "/admin/finance/revenue", iconName: "TrendingUp" as const },
        { label: "Transactions", href: "/admin/finance/transactions", iconName: "ArrowLeftRight" as const },
        { label: "Payout Requests", href: "/admin/finance/payout-requests", iconName: "Banknote" as const, badge: badges.payoutRequests },
      ],
    },
    {
      label: "Risk",
      items: [
        { label: "Rule Violations", href: "/admin/risk/violations", iconName: "ShieldAlert" as const },
        { label: "Manual Reviews", href: "/admin/risk/reviews", iconName: "Eye" as const, badge: badges.manualReviews },
        { label: "Audit Logs", href: "/admin/risk/audit-logs", iconName: "FileText" as const },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Personal Areas", href: "/admin/system/personal-areas", iconName: "Building2" as const },
        { label: "Email Queue", href: "/admin/system/email-queue", iconName: "Mail" as const },
        { label: "Admins", href: "/admin/system/admins", iconName: "UserCog" as const },
        { label: "Settings", href: "/admin/system/settings", iconName: "Settings" as const },
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
