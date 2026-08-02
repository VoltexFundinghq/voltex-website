import { requireUser } from "@/lib/auth/session";
import CustomerSidebar from "@/components/customer/CustomerSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-screen bg-black text-white">
      <CustomerSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
