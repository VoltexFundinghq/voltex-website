import { getTransactionsPage } from "@/lib/database/admin-transactions";
import AdminHeader from "@/components/admin/AdminHeader";
import TransactionsTable from "@/components/admin/TransactionsTable";
import { Download } from "lucide-react";

export default async function TransactionsPage() {
  const initial = await getTransactionsPage({ page: 1, pageSize: 25 });

  return (
    <div>
      <AdminHeader title="Transactions" />
      <div className="space-y-6 p-4 sm:p-8">
        <p className="text-xs text-zinc-500">The complete financial ledger — real payments, refunds, and payouts only. No manual credit/debit entries exist, since we have no mechanism to adjust real balances outside these actual flows.</p>

        <div className="flex justify-end">
          <a href="/api/admin/transactions/export" download className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        </div>

        <TransactionsTable initialTransactions={initial.transactions} initialTotalCount={initial.totalCount} />
      </div>
    </div>
  );
}
