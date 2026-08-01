"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, User, FileText, Wallet,
  UserCheck, ArrowUpCircle, CheckCircle2, XCircle,
} from "lucide-react";

interface ReviewRow {
  id: string;
  ticketNumber: number;
  createdAt: string;
  traderName: string | null;
  email: string | null;
  category: string;
  priority: string;
  assignedAdminName: string | null;
  status: string;
  updatedAt: string;
}

interface ReviewDetail {
  ticketNumber: number;
  customer: { name: string | null; email: string | null; username: string | null; country: string | null; phone: string | null } | null;
  challenge: { challengeId: string; accountSize: number | null; phase: number; status: string; purchaseDate: string | null } | null;
  tradingAccount: { mt5Login: string | null; server: string | null; balance: number | null; equity: number | null; status: string } | null;
  reviewDetails: { category: string; reason: string; description: string; sourceType: string; createdBy: string; createdAt: string };
  assignedAdminName: string | null;
  status: string;
  priority: string;
  resolutionNotes: string | null;
  timeline: { eventType: string; adminName: string | null; note: string | null; timestamp: string }[];
  notes: { authorName: string; note: string; timestamp: string }[];
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "waiting_customer", label: "Waiting Customer" },
  { value: "completed", label: "Completed" },
  { value: "escalated", label: "Escalated" },
  { value: "high_priority", label: "High Priority" },
];

const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];
const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "assigned", label: "Assigned" },
  { value: "waiting_customer", label: "Waiting Customer" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "escalated", label: "Escalated" },
];

const PAGE_SIZE = 20;

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function priorityBadge(p: string): string {
  if (p === "critical") return "bg-red-400/10 text-red-400";
  if (p === "high") return "bg-orange-400/10 text-orange-400";
  if (p === "medium") return "bg-amber-400/10 text-amber-400";
  return "bg-white/5 text-zinc-400";
}
function statusBadge(s: string): string {
  if (s === "open") return "bg-amber-400/10 text-amber-400";
  if (s === "assigned") return "bg-blue-400/10 text-blue-400";
  if (s === "waiting_customer") return "bg-purple-400/10 text-purple-400";
  if (s === "resolved") return "bg-emerald-400/10 text-emerald-400";
  if (s === "rejected") return "bg-white/5 text-zinc-400";
  if (s === "escalated") return "bg-red-400/10 text-red-400";
  return "bg-white/5 text-zinc-400";
}

function DetailPanel({ reviewId, onUpdated }: { reviewId: string; onUpdated: () => void }) {
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    setLoading(true);
    fetch(`/api/admin/manual-reviews/${reviewId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setResolutionNotes(data.resolutionNotes ?? ""); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, [reviewId]);

  async function handleAssignToMe() {
    setBusy(true);
    try { await fetch(`/api/admin/manual-reviews/${reviewId}/assign`, { method: "POST" }); load(); onUpdated(); } catch { alert("Failed."); }
    setBusy(false);
  }

  async function handlePriorityChange(priority: string) {
    setBusy(true);
    try { await fetch(`/api/admin/manual-reviews/${reviewId}/priority`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority }) }); load(); onUpdated(); } catch { alert("Failed."); }
    setBusy(false);
  }

  async function handleStatusChange(status: string) {
    setBusy(true);
    try {
      await fetch(`/api/admin/manual-reviews/${reviewId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, resolutionNotes }) });
      load(); onUpdated();
    } catch { alert("Failed."); }
    setBusy(false);
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/manual-reviews/${reviewId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: newNote }) });
      setNewNote("");
      load();
    } catch { alert("Failed."); }
    setBusy(false);
  }

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load detail.</div>;

  return (
    <div className="bg-black/30 p-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-5">
          {detail.customer && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Customer</h4>
              <div className="space-y-1 text-sm">
                <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.customer.name ?? "—"}</span></p>
                <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.customer.email ?? "—"}</span></p>
                <p className="text-zinc-400">Username: <span className="text-zinc-200">{detail.customer.username ?? "—"}</span></p>
                <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.customer.country ?? "—"}</span></p>
                <p className="text-zinc-400">Phone: <span className="text-zinc-200">{detail.customer.phone ?? "—"}</span></p>
              </div>
            </div>
          )}
          {detail.challenge && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Challenge</h4>
              <div className="space-y-1 text-sm">
                <p className="text-zinc-400">Size: <span className="text-zinc-200">{fmtMoney(detail.challenge.accountSize)}</span></p>
                <p className="text-zinc-400">Phase: <span className="text-zinc-200">{detail.challenge.phase}</span></p>
                <p className="text-zinc-400">Status: <span className="text-zinc-200">{detail.challenge.status}</span></p>
                <p className="text-zinc-400">Purchased: <span className="text-zinc-200">{detail.challenge.purchaseDate ? fmtDateTime(detail.challenge.purchaseDate) : "—"}</span></p>
              </div>
            </div>
          )}
          {detail.tradingAccount && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trading Account</h4>
              <div className="space-y-1 text-sm">
                <p className="text-zinc-400">MT5 Login: <span className="font-mono text-zinc-200">{detail.tradingAccount.mt5Login ?? "—"}</span></p>
                <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.tradingAccount.server ?? "—"}</span></p>
                <p className="text-zinc-400">Balance: <span className="text-zinc-200">{fmtMoney(detail.tradingAccount.balance)}</span></p>
                <p className="text-zinc-400">Equity: <span className="text-zinc-200">{fmtMoney(detail.tradingAccount.equity)}</span></p>
                <p className="text-zinc-400">Status: <span className="text-zinc-200">{detail.tradingAccount.status}</span></p>
              </div>
            </div>
          )}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Review Details</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Category: <span className="text-zinc-200">{detail.reviewDetails.category}</span></p>
              <p className="text-zinc-400">Reason: <span className="text-zinc-200">{detail.reviewDetails.reason}</span></p>
              <p className="text-zinc-400">Description: <span className="text-zinc-200">{detail.reviewDetails.description}</span></p>
              <p className="text-zinc-400">Created By: <span className="text-zinc-200">{detail.reviewDetails.createdBy}</span></p>
              <p className="text-zinc-400">Created: <span className="text-zinc-200">{fmtDateTime(detail.reviewDetails.createdAt)}</span></p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Assignment</h4>
            <p className="mb-2 text-sm text-zinc-400">Assigned: <span className="text-zinc-200">{detail.assignedAdminName ?? "Unassigned"}</span></p>
            <button onClick={handleAssignToMe} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50">
              <UserCheck className="h-3.5 w-3.5" strokeWidth={2} /> Assign To Me
            </button>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Priority</h4>
            <div className="flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((p) => (
                <button key={p} onClick={() => handlePriorityChange(p)} disabled={busy}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${detail.priority === p ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Resolution</h4>
            <select value={detail.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={busy}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Resolution notes..."
              rows={3}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
            />
            <button onClick={() => handleStatusChange("resolved")} disabled={busy} className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-400/20">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} /> Close Review
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timeline</h4>
            <div className="space-y-2">
              {detail.timeline.map((t, i) => (
                <div key={i} className="border-b border-white/5 pb-2 text-xs last:border-0">
                  <p className="text-zinc-300">{t.eventType} {t.adminName && <span className="text-zinc-500">— {t.adminName}</span>}</p>
                  {t.note && <p className="text-zinc-600">{t.note}</p>}
                  <p className="text-zinc-700">{fmtDateTime(t.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Internal Notes</h4>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a private note..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
            />
            <button onClick={handleAddNote} disabled={busy || !newNote.trim()} className="mt-2 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50">
              Save Note
            </button>
            <div className="mt-3 space-y-2">
              {detail.notes.map((n, i) => (
                <div key={i} className="rounded-lg border border-white/10 p-2 text-xs">
                  <p className="text-zinc-300">{n.note}</p>
                  <p className="mt-1 text-zinc-600">{n.authorName} · {fmtDateTime(n.timestamp)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionsMenu({ review, onUpdated }: { review: ReviewRow; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function quickEscalate() {
    setOpen(false);
    try { await fetch(`/api/admin/manual-reviews/${review.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "escalated" }) }); onUpdated(); } catch { alert("Failed."); }
  }

  const items = [
    { label: "View Trader", icon: User, action: () => setOpen(false), live: true },
    { label: "View Challenge", icon: FileText, action: () => setOpen(false), live: true },
    { label: "Open Trading Account", icon: Wallet, action: () => setOpen(false), live: true },
    { label: "Escalate", icon: ArrowUpCircle, action: quickEscalate, live: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} onClick={(e) => { e.stopPropagation(); item.action(); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ManualReviewsTable({ initialReviews, initialTotalCount }: { initialReviews: ReviewRow[]; initialTotalCount: number }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReviews = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/manual-reviews?${params}`)
      .then((r) => r.json())
      .then((data) => { setReviews(data.reviews); setTotalCount(data.totalCount); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchReviews(search, filter, page), search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [search, filter, page, fetchReviews]);

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
            placeholder="Search trader, email, ticket ID..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => handleFilterChange(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.value ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">Loading...</p></div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No manual reviews currently require attention.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Assigned To</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <>
                    <tr key={r.id} onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className={`cursor-pointer border-b border-white/5 hover:bg-white/[0.02] ${r.priority === "critical" ? "bg-red-400/[0.03]" : ""}`}>
                      <td className="px-2 py-3 text-zinc-600">{expandedId === r.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(r.createdAt)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">MR-{String(r.ticketNumber).padStart(6, "0")}</td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-300">{r.traderName ?? "—"}</p>
                        <p className="text-xs text-zinc-600">{r.email ?? ""}</p>
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{r.category}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${priorityBadge(r.priority)}`}>{r.priority}</span></td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{r.assignedAdminName ?? "Unassigned"}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${statusBadge(r.status)}`}>{r.status.replace("_", " ")}</span></td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{timeAgo(r.updatedAt)}</td>
                      <td className="px-2 py-3"><ActionsMenu review={r} onUpdated={() => fetchReviews(search, filter, page)} /></td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-detail`}><td colSpan={10} className="p-0"><DetailPanel reviewId={r.id} onUpdated={() => fetchReviews(search, filter, page)} /></td></tr>
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
