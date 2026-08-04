"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, CheckCircle2, Circle } from "lucide-react";

interface TransactionRow {
  id: string;
  timestamp: string;
  type: string;
  traderName: string | null;
  email: string;
  amount: number;
  gateway: string;
  reference: string | null;
  status: string;
  createdBy: string;
}

interface TransactionDetail {
  id: string;
  type: string;
  timestamp: string;
  amount: number;
  status: string;
  createdBy: string;
  reason: string | null;
  linkedPurchaseId: string | null;
  linkedPayoutId: string | null;
  auditTrail: { label: string; timestamp: string | null }[];
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "payments", label: "Payments" },
  { value: "refunds", label: "Refunds" },
  { value: "payouts", label: "Payouts" },
];

const PAGE_SIZE = 25;

function fmtDateTime(dateStr: string): string { return new Date(dateStr).toLocaleString(); }
function typeBadge(type: string): string {
  if (type === "Payment") return "bg-emerald-400/10 text-emerald-400";
  if (type === "Refund") return "bg-red-400/10 text-red-400";
  return "bg-[#D4AF37]/10 text-[#D4AF37]";
}
function statusBadge(status: string): string {
  if (["completed", "approved"].includes(status)) return "bg-emerald-400/10 text-emerald-400";
  if (["failed", "rejected"].includes(status)) return "bg-red-400/10 text-red-400";
  return "bg-amber-400/10 text-amber-400";
}

function DetailPanel({ transactionId }: { transactionId: string }) {
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  useEffect(() => { fetch(`/api/admin/transactions/${transactionId}`).then((r) => r.json()).then(setDetail); }, [transactionId]);

  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;

  return (
    <div className="grid gap-6 bg-black/30 p-6 md:grid-cols-2">
      <div className="space-y-3 text-sm">
        <p className="text-zinc-400">Created By: <span className="text-zinc-200">{detail.createdBy}</span></p>
        {detail.reason && <p className="text-zinc-400">Reason: <span className="text-zinc-200">{detail.reason}</span></p>}
        {detail.linkedPurchaseId && <p className="text-zinc-400">Linked Purchase: <span className="font-mono text-xs text-zinc-200">{detail.linkedPurchaseId}</span></p>}
        {detail.linkedPayoutId && <p className="text-zinc-400">Linked Payout: <span className="font-mono text-xs text-zinc-200">{detail.linkedPayoutId}</span></p>}
      </div>
      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Audit Log</h4>
        {detail.auditTrail.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.timestamp ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                {step.timestamp ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
              </div>
              {i < detail.auditTrail.length - 1 && <div className={`w-px flex-1 ${step.timestamp ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "20px" }} />}
            </div>
            <div className="pb-4">
              <p className={`text-sm ${step.timestamp ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
              <p className="text-xs text-zinc-600">{step.timestamp ? fmtDateTime(step.timestamp) : "Not yet reached"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TransactionsTable({ initialTransactions, initialTotalCount }: { initialTransactions: TransactionRow[]; initialTotalCount: number }) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTx = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/transactions?${params}`).then((r) => r.json()).then((data) => { setTransactions(data.transactions); setTotalCount(data.totalCount); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchTx(search, filter, page), search ? 350 : 0); return () => clearTimeout(t); }, [search, filter, page, fetchTx]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search trader, email, reference..." className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === f.value ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">Loading...</p></div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">No transactions recorded yet.</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Gateway</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created By</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <>
                    <tr key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-3 text-zinc-600">{expandedId === t.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(t.timestamp)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeBadge(t.type)}`}>{t.type}</span></td>
                      <td className="px-4 py-3"><p className="text-zinc-300">{t.traderName ?? "—"}</p><p className="text-xs text-zinc-600">{t.email}</p></td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">₦{t.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-zinc-500">{t.gateway}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{t.reference ?? "—"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(t.status)}`}>{t.status}</span></td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{t.createdBy}</td>
                    </tr>
                    {expandedId === t.id && <tr key={`${t.id}-d`}><td colSpan={9} className="p-0"><DetailPanel transactionId={t.id} /></td></tr>}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-zinc-500">Page {page} of {totalPages} ({totalCount} total)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-400 disabled:opacity-30">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-400 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
