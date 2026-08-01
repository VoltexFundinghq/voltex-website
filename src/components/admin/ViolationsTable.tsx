"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronDown, ChevronRight, MoreVertical, User, Receipt, CheckCircle2, Circle } from "lucide-react";

interface ViolationRow {
  challengeId: string;
  violationDate: string | null;
  traderName: string | null;
  email: string;
  accountSize: number | null;
  accountLogin: string | null;
  ruleBroken: string;
  actualValue: string;
  allowedValue: string;
  reviewStatus: string;
}

interface TimelineStep { label: string; timestamp: string | null; reached: boolean }

interface ViolationDetail {
  trader: { name: string | null; email: string; username: string | null; country: string | null };
  challenge: { challengeId: string; accountSize: number | null; phase: number; startDate: string | null; failureDate: string | null };
  tradingAccount: { mt5Login: string | null; server: string | null; currentBalance: number | null; currentEquity: number | null; highestEquity: number | null };
  violation: { ruleBroken: string; actualValue: string; allowedValue: string; difference: string; triggerTime: string | null; openTradesAtViolation: number | null; source: string };
  timeline: TimelineStep[];
  reviewStatus: string;
  adminNotes: string;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "max_drawdown", label: "Max Drawdown" },
  { value: "hold_time", label: "Min Hold Time" },
  { value: "weekend", label: "Weekend Holding" },
  { value: "news", label: "News Trading" },
  { value: "inactivity", label: "Inactivity" },
  { value: "reviewed", label: "Reviewed" },
  { value: "pending_review", label: "Pending Review" },
];

const REVIEW_OPTIONS = [
  { value: "pending_review", label: "Pending Review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "escalated", label: "Escalated" },
  { value: "resolved", label: "Resolved" },
];

const PAGE_SIZE = 20;

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}

function reviewBadge(status: string): string {
  if (status === "reviewed") return "bg-blue-400/10 text-blue-400";
  if (status === "escalated") return "bg-red-400/10 text-red-400";
  if (status === "resolved") return "bg-emerald-400/10 text-emerald-400";
  return "bg-amber-400/10 text-amber-400";
}

function DetailPanel({ challengeId, onReviewed }: { challengeId: string; onReviewed: (status: string) => void }) {
  const [detail, setDetail] = useState<ViolationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending_review");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/rule-violations/${challengeId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setNotes(data.adminNotes ?? ""); setStatus(data.reviewStatus); setLoading(false); })
      .catch(() => setLoading(false));
  }, [challengeId]);

  async function saveReview(newStatus?: string) {
    setSaving(true);
    const statusToSave = newStatus ?? status;
    try {
      const res = await fetch(`/api/admin/rule-violations/${challengeId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: statusToSave, adminNotes: notes }),
      });
      if (res.ok) {
        setStatus(statusToSave);
        onReviewed(statusToSave);
      } else {
        alert("Failed to save.");
      }
    } catch {
      alert("Failed to save.");
    }
    setSaving(false);
  }

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load detail.</div>;

  return (
    <div className="grid gap-6 bg-black/30 p-6 md:grid-cols-3">
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trader</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.trader.name ?? "—"}</span></p>
            <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.trader.email}</span></p>
            <p className="text-zinc-400">Username: <span className="text-zinc-200">{detail.trader.username ?? "—"}</span></p>
            <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.trader.country ?? "—"}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Challenge</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Size: <span className="text-zinc-200">{fmtMoney(detail.challenge.accountSize)}</span></p>
            <p className="text-zinc-400">Phase: <span className="text-zinc-200">{detail.challenge.phase}</span></p>
            <p className="text-zinc-400">Started: <span className="text-zinc-200">{fmtDate(detail.challenge.startDate)}</span></p>
            <p className="text-zinc-400">Failed: <span className="text-zinc-200">{fmtDate(detail.challenge.failureDate)}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trading Account</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">MT5 Login: <span className="font-mono text-zinc-200">{detail.tradingAccount.mt5Login ?? "—"}</span></p>
            <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.tradingAccount.server ?? "—"}</span></p>
            <p className="text-zinc-400">Balance: <span className="text-zinc-200">{fmtMoney(detail.tradingAccount.currentBalance)}</span></p>
            <p className="text-zinc-400">Equity: <span className="text-zinc-200">{fmtMoney(detail.tradingAccount.currentEquity)}</span></p>
            <p className="text-zinc-400">Highest Equity: <span className="text-zinc-200">{fmtMoney(detail.tradingAccount.highestEquity)}</span></p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Violation Details</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Rule: <span className="text-red-400">{detail.violation.ruleBroken}</span></p>
            <p className="text-zinc-400">Actual: <span className="text-zinc-200">{detail.violation.actualValue}</span></p>
            <p className="text-zinc-400">Allowed: <span className="text-zinc-200">{detail.violation.allowedValue}</span></p>
            <p className="text-zinc-400">Difference: <span className="text-zinc-200">{detail.violation.difference}</span></p>
            <p className="text-zinc-400">Trigger Time: <span className="text-zinc-200">{fmtDateTime(detail.violation.triggerTime)}</span></p>
            <p className="text-zinc-400">Open Trades: <span className="text-zinc-200">{detail.violation.openTradesAtViolation ?? "—"}</span></p>
            <p className="text-zinc-400">Source: <span className="text-zinc-200">{detail.violation.source}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Review Status</h4>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none"
          >
            {REVIEW_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Admin Notes</h4>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Internal notes..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
          />
          <button
            onClick={() => saveReview()}
            disabled={saving}
            className="mt-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timeline</h4>
        <div>
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

function ActionsMenu({ violation, onReviewed }: { violation: ViolationRow; onReviewed: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function quickMarkReviewed() {
    setOpen(false);
    try {
      await fetch(`/api/admin/rule-violations/${violation.challengeId}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewStatus: "reviewed", adminNotes: null }),
      });
      onReviewed("reviewed");
    } catch { alert("Failed to update."); }
  }

  async function quickEscalate() {
    setOpen(false);
    try {
      await fetch(`/api/admin/rule-violations/${violation.challengeId}/review`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewStatus: "escalated", adminNotes: null }),
      });
      onReviewed("escalated");
    } catch { alert("Failed to update."); }
  }

  const items = [
    { label: "View Trader", icon: User, action: () => setOpen(false), live: true },
    { label: "View Trading History", icon: Receipt, action: () => setOpen(false), live: true },
    { label: "Mark Reviewed", icon: CheckCircle2, action: quickMarkReviewed, live: true },
    { label: "Escalate", icon: CheckCircle2, action: quickEscalate, live: true },
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

export default function ViolationsTable({ initialViolations, initialTotalCount }: { initialViolations: ViolationRow[]; initialTotalCount: number }) {
  const [violations, setViolations] = useState(initialViolations);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchViolations = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/rule-violations?${params}`)
      .then((r) => r.json())
      .then((data) => { setViolations(data.violations); setTotalCount(data.totalCount); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchViolations(search, filter, page), search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [search, filter, page, fetchViolations]);

  function handleFilterChange(f: string) {
    setFilter(f);
    setPage(1);
  }

  function handleReviewed(challengeId: string, status: string) {
    setViolations((prev) => prev.map((v) => (v.challengeId === challengeId ? { ...v, reviewStatus: status } : v)));
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
            placeholder="Search trader, email, MT5 login, challenge ID..."
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
      ) : violations.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No rule violations recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Violation Date</th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium text-right">Size</th>
                  <th className="px-4 py-3 font-medium">MT5 Login</th>
                  <th className="px-4 py-3 font-medium">Rule Broken</th>
                  <th className="px-4 py-3 font-medium">Actual</th>
                  <th className="px-4 py-3 font-medium">Allowed</th>
                  <th className="px-4 py-3 font-medium">Reviewed</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {violations.map((v) => (
                  <>
                    <tr key={v.challengeId} onClick={() => setExpandedId(expandedId === v.challengeId ? null : v.challengeId)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-3 text-zinc-600">{expandedId === v.challengeId ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(v.violationDate)}</td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-300">{v.traderName ?? "—"}</p>
                        <p className="text-xs text-zinc-600">{v.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(v.accountSize)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{v.accountLogin ?? "—"}</td>
                      <td className="px-4 py-3 text-red-400">{v.ruleBroken}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{v.actualValue}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{v.allowedValue}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${reviewBadge(v.reviewStatus)}`}>{v.reviewStatus.replace("_", " ")}</span></td>
                      <td className="px-2 py-3"><ActionsMenu violation={v} onReviewed={(status) => handleReviewed(v.challengeId, status)} /></td>
                    </tr>
                    {expandedId === v.challengeId && (
                      <tr key={`${v.challengeId}-detail`}><td colSpan={10} className="p-0"><DetailPanel challengeId={v.challengeId} onReviewed={(status) => handleReviewed(v.challengeId, status)} /></td></tr>
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
