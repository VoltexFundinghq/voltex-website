"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronDown, ChevronRight, MoreVertical, ShieldCheck, Undo2, Copy, CheckCircle2, Circle } from "lucide-react";

interface PaymentRow {
  id: string;
  createdAt: string;
  traderName: string | null;
  email: string;
  challengeSize: string;
  amount: number;
  status: string;
  reference: string | null;
}

interface PaymentDetail {
  id: string;
  customer: { name: string | null; email: string; username: string | null; country: string | null };
  challenge: { size: string; amount: number };
  metadata: { reference: string | null; ipAddress: string | null; deviceSummary: string | null; country: string | null };
  timeline: { label: string; timestamp: string | null; reached: boolean }[];
  status: string;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Successful" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const PAGE_SIZE = 20;

function fmtDateTime(dateStr: string): string { return new Date(dateStr).toLocaleString(); }
function statusBadge(status: string): string {
  if (status === "completed") return "bg-emerald-400/10 text-emerald-400";
  if (status === "failed") return "bg-red-400/10 text-red-400";
  if (status === "refunded") return "bg-white/5 text-zinc-400";
  return "bg-amber-400/10 text-amber-400";
}

function DetailPanel({ paymentId }: { paymentId: string }) {
  const [detail, setDetail] = useState<PaymentDetail | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetch(`/api/admin/payments/${paymentId}`).then((r) => r.json()).then(setDetail); }, [paymentId]);

  async function copyRef() {
    if (detail?.metadata.reference) {
      await navigator.clipboard.writeText(detail.metadata.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;

  return (
    <div className="grid gap-6 bg-black/30 p-6 md:grid-cols-3">
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Customer</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.customer.name ?? "—"}</span></p>
            <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.customer.email}</span></p>
            <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.customer.country ?? "—"}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Challenge Purchased</h4>
          <p className="text-sm text-zinc-200">{detail.challenge.size} — ₦{detail.challenge.amount.toLocaleString()}</p>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Payment Metadata</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <p className="text-zinc-400">Reference: <span className="font-mono text-xs text-zinc-200">{detail.metadata.reference ?? "—"}</span></p>
              <button onClick={copyRef} className="text-zinc-500 hover:text-white">{copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}</button>
            </div>
            <p className="text-zinc-400">IP Address: <span className="font-mono text-xs text-zinc-200">{detail.metadata.ipAddress ?? "Not on file"}</span></p>
            <p className="text-zinc-400">Device: <span className="text-zinc-200">{detail.metadata.deviceSummary ?? "Not on file"}</span></p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Payment Timeline</h4>
        {detail.timeline.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                {step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
              </div>
              {i < detail.timeline.length - 1 && <div className={`w-px flex-1 ${step.reached ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "20px" }} />}
            </div>
            <div className="pb-4">
              <p className={`text-sm ${step.reached ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
              <p className="text-xs text-zinc-600">{step.timestamp ? fmtDateTime(step.timestamp) : "Not yet reached"}</p>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Actions</h4>
        <ActionsMenuInline paymentId={paymentId} status={detail.status} reference={detail.metadata.reference} />
      </div>
    </div>
  );
}

function ActionsMenuInline({ paymentId, status, reference }: { paymentId: string; status: string; reference: string | null }) {
  const [busy, setBusy] = useState(false);

  async function retryVerification() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/purchases/${paymentId}/retry-verification`, { method: "POST" });
      const data = await res.json();
      alert(data.message ?? (res.ok ? "Verified." : "Failed."));
    } catch { alert("Failed."); }
    setBusy(false);
  }

  async function markRefunded() {
    if (!confirm("Only confirm this AFTER you've already manually refunded the customer through PalmPay. This does not trigger a real refund — it only updates our records.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/mark-refunded`, { method: "POST" });
      if (res.ok) { alert("Marked as refunded."); window.location.reload(); } else { alert("Failed."); }
    } catch { alert("Failed."); }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-1.5">
      {status === "pending" && (
        <button onClick={retryVerification} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><ShieldCheck className="h-3.5 w-3.5" /> Retry Verification</button>
      )}
      {status === "completed" && (
        <button onClick={markRefunded} disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-amber-400/20 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-400/10">
          <Undo2 className="h-3.5 w-3.5" /> Mark as Refunded (after manual PalmPay refund)
        </button>
      )}
    </div>
  );
}

export default function PaymentsTable({ initialPayments, initialTotalCount }: { initialPayments: PaymentRow[]; initialTotalCount: number }) {
  const [payments, setPayments] = useState(initialPayments);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPayments = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/payments?${params}`).then((r) => r.json()).then((data) => { setPayments(data.payments); setTotalCount(data.totalCount); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchPayments(search, filter, page), search ? 350 : 0); return () => clearTimeout(t); }, [search, filter, page, fetchPayments]);

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
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No payments have been received yet.</p>
          <p className="mt-1 text-xs text-zinc-600">The first successful challenge purchase will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium">Challenge</th>
                  <th className="px-4 py-3 font-medium">Gateway</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <>
                    <tr key={p.id} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-3 text-zinc-600">{expandedId === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(p.createdAt)}</td>
                      <td className="px-4 py-3"><p className="text-zinc-300">{p.traderName ?? "—"}</p><p className="text-xs text-zinc-600">{p.email}</p></td>
                      <td className="px-4 py-3 text-zinc-400">{p.challengeSize}</td>
                      <td className="px-4 py-3 text-zinc-500">PalmPay</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">₦{p.amount.toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(p.status)}`}>{p.status}</span></td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.reference ?? "—"}</td>
                    </tr>
                    {expandedId === p.id && <tr key={`${p.id}-d`}><td colSpan={8} className="p-0"><DetailPanel paymentId={p.id} /></td></tr>}
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
