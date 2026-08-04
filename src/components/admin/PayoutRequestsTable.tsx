"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, CheckCircle2, XCircle, Banknote, Circle, ExternalLink } from "lucide-react";

interface PayoutRow {
  id: string;
  traderName: string | null;
  email: string;
  accountLogin: string | null;
  profit: number;
  requestedAmount: number;
  profitSplitPercent: number;
  status: string;
  requestedAt: string;
}

interface PayoutDetail {
  id: string;
  trader: { name: string | null; email: string; country: string | null };
  tradingAccount: { login: string | null; server: string | null; balance: number | null; equity: number | null };
  profitBreakdown: { totalProfit: number; profitSplitPercent: number; requestedAmount: number };
  previousPayouts: { amount: number; status: string; date: string }[];
  riskCheck: { ruleViolationsCount: number; latestAlert: string | null };
  timeline: { label: string; timestamp: string | null; reached: boolean }[];
  status: string;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Paid" },
];

const PAGE_SIZE = 25;

function fmtDateTime(dateStr: string): string { return new Date(dateStr).toLocaleString(); }
function statusBadge(status: string): string {
  if (status === "approved") return "bg-blue-400/10 text-blue-400";
  if (status === "rejected") return "bg-red-400/10 text-red-400";
  if (status === "completed") return "bg-emerald-400/10 text-emerald-400";
  return "bg-amber-400/10 text-amber-400";
}

function DetailPanel({ payoutId, onUpdated }: { payoutId: string; onUpdated: () => void }) {
  const [detail, setDetail] = useState<PayoutDetail | null>(null);
  const [busy, setBusy] = useState(false);

  function load() { fetch(`/api/admin/payout-requests/${payoutId}`).then((r) => r.json()).then(setDetail); }
  useEffect(() => { load(); }, [payoutId]);

  async function handleApprove() {
    setBusy(true);
    try { const r = await fetch(`/api/admin/payout-requests/${payoutId}/approve`, { method: "POST" }); const d = await r.json(); if (r.ok) { load(); onUpdated(); } else alert(d.error); } catch { alert("Failed."); }
    setBusy(false);
  }
  async function handleReject() {
    const reason = prompt("Reason for rejection (optional):") ?? "";
    setBusy(true);
    try { const r = await fetch(`/api/admin/payout-requests/${payoutId}/reject`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); const d = await r.json(); if (r.ok) { load(); onUpdated(); } else alert(d.error); } catch { alert("Failed."); }
    setBusy(false);
  }
  async function handleMarkPaid() {
    if (!confirm("Confirm you have actually sent this payment before marking paid.")) return;
    setBusy(true);
    try { const r = await fetch(`/api/admin/payout-requests/${payoutId}/mark-paid`, { method: "POST" }); const d = await r.json(); if (r.ok) { load(); onUpdated(); } else alert(d.error); } catch { alert("Failed."); }
    setBusy(false);
  }

  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;

  return (
    <div className="bg-black/30 p-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trader Information</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.trader.name ?? "—"}</span></p>
              <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.trader.email}</span></p>
              <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.trader.country ?? "—"}</span></p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trading Account</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Login: <span className="font-mono text-zinc-200">{detail.tradingAccount.login ?? "—"}</span></p>
              <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.tradingAccount.server ?? "—"}</span></p>
              <p className="text-zinc-400">Balance: <span className="text-zinc-200">₦{(detail.tradingAccount.balance ?? 0).toLocaleString()}</span></p>
              <p className="text-zinc-400">Equity: <span className="text-zinc-200">₦{(detail.tradingAccount.equity ?? 0).toLocaleString()}</span></p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Profit Breakdown</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Total Profit: <span className="text-zinc-200">₦{detail.profitBreakdown.totalProfit.toLocaleString()}</span></p>
              <p className="text-zinc-400">Split: <span className="text-zinc-200">{detail.profitBreakdown.profitSplitPercent}%</span></p>
              <p className="text-[#D4AF37]">Requested Amount: <span className="font-semibold">₦{detail.profitBreakdown.requestedAmount.toLocaleString()}</span></p>
            </div>
            <p className="mt-2 text-xs text-zinc-600">Bank details aren't collected anywhere in our system yet — a real gap worth its own follow-up build.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Previous Payouts</h4>
            {detail.previousPayouts.length === 0 ? <p className="text-sm text-zinc-600">None yet.</p> : (
              <div className="space-y-1.5">
                {detail.previousPayouts.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-zinc-400">₦{p.amount.toLocaleString()} ({p.status})</span>
                    <span className="text-zinc-600">{fmtDateTime(p.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Risk Check</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Rule Violations: <span className="text-zinc-200">{detail.riskCheck.ruleViolationsCount}</span></p>
              <p className="text-zinc-400">Latest Alert: <span className="text-zinc-200">{detail.riskCheck.latestAlert ?? "None"}</span></p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Actions</h4>
            <div className="flex flex-wrap gap-1.5">
              {detail.status === "pending" && (
                <>
                  <button onClick={handleApprove} disabled={busy} className="flex items-center gap-1 rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-400/20"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                  <button onClick={handleReject} disabled={busy} className="flex items-center gap-1 rounded-lg bg-red-400/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/20"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                  <a href="/admin/risk/reviews" className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"><ExternalLink className="h-3.5 w-3.5" /> View in Manual Reviews</a>
                </>
              )}
              {detail.status === "approved" && (
                <button onClick={handleMarkPaid} disabled={busy} className="flex items-center gap-1 rounded-lg bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-medium text-[#D4AF37] hover:bg-[#D4AF37]/20"><Banknote className="h-3.5 w-3.5" /> Mark Paid</button>
              )}
              <button disabled className="cursor-not-allowed rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-600">Download Receipt (soon)</button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timeline</h4>
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
      </div>
    </div>
  );
}

export default function PayoutRequestsTable({ initialPayouts, initialTotalCount }: { initialPayouts: PayoutRow[]; initialTotalCount: number }) {
  const [payouts, setPayouts] = useState(initialPayouts);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPayouts = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/payout-requests?${params}`).then((r) => r.json()).then((data) => { setPayouts(data.payouts); setTotalCount(data.totalCount); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchPayouts(search, filter, page), search ? 350 : 0); return () => clearTimeout(t); }, [search, filter, page, fetchPayouts]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search trader, email..." className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === f.value ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">Loading...</p></div>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">No payout requests yet.</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium">Account</th>
                  <th className="px-4 py-3 font-medium text-right">Profit</th>
                  <th className="px-4 py-3 font-medium text-right">Requested</th>
                  <th className="px-4 py-3 font-medium">Split</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <>
                    <tr key={p.id} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-3 text-zinc-600">{expandedId === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                      <td className="px-4 py-3"><p className="text-zinc-300">{p.traderName ?? "—"}</p><p className="text-xs text-zinc-600">{p.email}</p></td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.accountLogin ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">₦{p.profit.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#D4AF37]">₦{p.requestedAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-zinc-400">{p.profitSplitPercent}%</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(p.status)}`}>{p.status}</span></td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(p.requestedAt)}</td>
                    </tr>
                    {expandedId === p.id && <tr key={`${p.id}-d`}><td colSpan={8} className="p-0"><DetailPanel payoutId={p.id} onUpdated={() => fetchPayouts(search, filter, page)} /></td></tr>}
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
