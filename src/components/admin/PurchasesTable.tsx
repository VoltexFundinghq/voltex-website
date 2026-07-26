"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, User, FileText, Copy,
  RotateCw, ShieldCheck, CheckCircle2, Circle, XCircle,
} from "lucide-react";

interface PurchaseRow {
  id: string;
  created_at: string;
  email: string;
  full_name: string | null;
  challenge_size: string;
  price_paid: number;
  payment_status: string;
  payment_reference: string | null;
  provisionStatus: string;
  needsAttention: boolean;
}

interface TimelineStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  failed?: boolean;
}

interface PurchaseDetail {
  id: string;
  customer: { name: string | null; email: string; username: string | null; country: string | null };
  purchase: { challenge_size: string; price_paid: number; created_at: string };
  payment: { gateway: string; reference: string | null; status: string };
  provision: { status: string; mt5Login: string | null; server: string | null; vpsSlot: string | null; credentialsSent: boolean };
  orderAgeMinutes: number;
  cancelled: boolean;
  timeline: TimelineStep[];
  matchedChallengeId: string | null;
  userId: string;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Successful" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "queued", label: "Provision Queue" },
  { value: "provisioning", label: "Provisioning" },
  { value: "completed_provision", label: "Completed" },
];

const PAGE_SIZE = 20;

function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}
function fmtAge(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? "" : "s"}`;
  return `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) === 1 ? "" : "s"}`;
}

function paymentStatusBadge(status: string): string {
  if (status === "completed") return "bg-emerald-400/10 text-emerald-400";
  if (status === "failed") return "bg-red-400/10 text-red-400";
  if (status === "refunded") return "bg-white/5 text-zinc-400";
  return "bg-amber-400/10 text-amber-400";
}
function provisionStatusBadge(status: string): string {
  if (status === "completed") return "bg-emerald-400/10 text-emerald-400";
  if (status === "error") return "bg-red-400/10 text-red-400";
  if (status === "cancelled") return "bg-white/5 text-zinc-500";
  if (status === "provisioning") return "bg-blue-400/10 text-blue-400";
  if (status === "queued") return "bg-amber-400/10 text-amber-400";
  return "bg-white/5 text-zinc-400";
}

function ActionsMenu({ purchase }: { purchase: PurchaseRow }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function copyReference() {
    if (purchase.payment_reference) {
      await navigator.clipboard.writeText(purchase.payment_reference);
      setMsg("Copied!");
      setTimeout(() => setMsg(null), 1500);
    }
    setOpen(false);
  }

  async function retryVerification() {
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/purchases/${purchase.id}/retry-verification`, { method: "POST" });
      const data = await res.json();
      alert(data.message ?? (res.ok ? "Verified." : "Failed to verify."));
    } catch {
      alert("Failed to verify.");
    }
  }

  async function retryProvision() {
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/purchases/${purchase.id}/retry-provision`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? "Provisioned successfully." : data.error ?? "Failed to provision.");
    } catch {
      alert("Failed to provision.");
    }
  }

  const items = [
    { label: "View User", icon: User, action: () => setOpen(false), live: true },
    { label: "View Challenge", icon: FileText, action: () => setOpen(false), live: true },
    { label: "Copy Reference", icon: Copy, action: copyReference, live: !!purchase.payment_reference },
    ...(purchase.payment_status === "pending" ? [{ label: "Retry Verification", icon: ShieldCheck, action: retryVerification, live: true }] : []),
    ...(purchase.payment_status === "completed" && (purchase.provisionStatus === "error" || purchase.provisionStatus === "queued") ? [{ label: "Retry Provision", icon: RotateCw, action: retryProvision, live: true }] : []),
    { label: "View Raw Webhook", icon: FileText, action: () => setOpen(false), live: false },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {msg && <span className="absolute -top-6 right-0 text-xs text-emerald-400">{msg}</span>}
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={(e) => { e.stopPropagation(); item.action(); }}
                disabled={!item.live}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${item.live ? "text-zinc-300 hover:bg-white/5" : "cursor-not-allowed text-zinc-600"}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {item.label}
                {!item.live && <span className="ml-auto text-[10px] text-zinc-700">soon</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PurchaseDetailPanel({ purchaseId }: { purchaseId: string }) {
  const [detail, setDetail] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/purchases/${purchaseId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [purchaseId]);

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load purchase detail.</div>;

  return (
    <div className="grid gap-6 bg-black/30 p-6 md:grid-cols-2">
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Customer</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.customer.name ?? "—"}</span></p>
            <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.customer.email}</span></p>
            <p className="text-zinc-400">Username: <span className="text-zinc-200">{detail.customer.username ?? "—"}</span></p>
            <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.customer.country ?? "—"}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Purchase</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Challenge: <span className="text-zinc-200">{detail.purchase.challenge_size}</span></p>
            <p className="text-zinc-400">Amount: <span className="text-zinc-200">₦{detail.purchase.price_paid.toLocaleString()}</span></p>
            <p className="text-zinc-400">Date: <span className="text-zinc-200">{fmtDateTime(detail.purchase.created_at)}</span></p>
            <p className="text-zinc-400">Age: <span className="text-zinc-200">{fmtAge(detail.orderAgeMinutes)}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Payment</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Gateway: <span className="text-zinc-200">{detail.payment.gateway}</span></p>
            <p className="text-zinc-400">Reference: <span className="font-mono text-xs text-zinc-200">{detail.payment.reference ?? "—"}</span></p>
            <p className="text-zinc-400">Status: <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentStatusBadge(detail.payment.status)}`}>{detail.payment.status}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Provision</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Status: <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${provisionStatusBadge(detail.provision.status)}`}>{detail.provision.status === "waiting" ? "Waiting for Allocation" : detail.provision.status}</span></p>
            <p className="text-zinc-400">MT5 Login: <span className="font-mono text-zinc-200">{detail.provision.mt5Login ?? "Not Assigned"}</span></p>
            <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.provision.server ?? "—"}</span></p>
            <p className="text-zinc-400">VPS: <span className="text-zinc-200">{detail.provision.vpsSlot ?? "—"}</span></p>
            <p className="text-zinc-400">Credentials: <span className={detail.provision.credentialsSent ? "text-emerald-400" : "text-zinc-200"}>{detail.provision.credentialsSent ? "Sent" : "Not Sent"}</span></p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timeline</h4>
        <div>
          {detail.timeline.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.failed ? "bg-red-400" : step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                  {step.failed ? <XCircle className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
                </div>
                {i < detail.timeline.length - 1 && <div className={`w-px flex-1 ${step.reached || step.failed ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "22px" }} />}
              </div>
              <div className="pb-5">
                <p className={`text-sm ${step.failed ? "text-red-400" : step.reached ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
                <p className="text-xs text-zinc-600">{step.timestamp ? fmtDateTime(step.timestamp) : "Not yet reached"}</p>
              </div>
            </div>
          ))}
          {detail.cancelled && (
            <div className="mt-2 border-t border-white/10 pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">Provision Cancelled</p>
              <p className="mt-1 text-xs text-zinc-600">Payment failed — provisioning will never begin for this purchase.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PurchasesTable({ initialPurchases, initialTotalCount }: { initialPurchases: PurchaseRow[]; initialTotalCount: number }) {
  const [purchases, setPurchases] = useState(initialPurchases);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPurchases = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/purchases?${params}`)
      .then((r) => r.json())
      .then((data) => { setPurchases(data.purchases); setTotalCount(data.totalCount); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchPurchases(search, filter, page), search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [search, filter, page, fetchPurchases]);

  function handleFilterChange(f: string) {
    setFilter(f);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name, email, username, reference, challenge size..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.value ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">Loading...</p></div>
      ) : purchases.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">No purchases match this search or filter.</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Purchase Time</th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium">Challenge</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Provision</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <>
                    <tr key={p.id} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className={`cursor-pointer border-b border-white/5 hover:bg-white/[0.02] ${p.needsAttention ? "bg-red-400/[0.03]" : ""}`}>
                      <td className="px-2 py-3 text-zinc-600">
                        {expandedId === p.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-300">{p.full_name ?? "—"}</p>
                        <p className="text-xs text-zinc-600">{p.email}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{p.challenge_size}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">₦{p.price_paid.toLocaleString()}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentStatusBadge(p.payment_status)}`}>{p.payment_status}</span></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${provisionStatusBadge(p.provisionStatus)}`}>{p.provisionStatus}</span></td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{p.payment_reference ?? "—"}</td>
                      <td className="px-2 py-3"><ActionsMenu purchase={p} /></td>
                    </tr>
                    {expandedId === p.id && (
                      <tr key={`${p.id}-detail`}><td colSpan={9} className="p-0"><PurchaseDetailPanel purchaseId={p.id} /></td></tr>
                    )}
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
