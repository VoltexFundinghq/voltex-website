"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, Package, Server, Receipt,
  Mail, RotateCw, CheckCircle2, XCircle, Circle,
} from "lucide-react";

interface PassedTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  accountSize: number | null;
  completedAt: string | null;
  waitSeconds: number | null;
  fundingStatus: "funded" | "stuck";
  fundedAccountLogin: string | null;
  vpsSlot: string | null;
}

interface WorkflowStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  errored?: boolean;
}

interface PassedTraderDetail {
  customer: { name: string | null; email: string; username: string | null; country: string | null };
  challengeCompletedAt: string | null;
  phase1Result: { passed: boolean; timestamp: string | null };
  phase2Result: { passed: boolean; timestamp: string | null };
  profitTargetAchieved: boolean;
  ruleViolationsCount: number;
  fundingStatus: "funded" | "stuck";
  fundedAccount: { login: string | null; vpsSlot: string | null } | null;
  fundedAt: string | null;
  credentialsSent: boolean;
  assignedBy: string;
  internalNotes: string;
  workflow: WorkflowStep[];
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "passed_today", label: "Passed Today" },
  { value: "passed_week", label: "Passed This Week" },
  { value: "funding_pending", label: "Needs Manual Funding" },
];

const PAGE_SIZE = 20;

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}
function fmtDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 5) return "Instant";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function ActionsMenu({ trader, onUpdated }: { trader: PassedTraderRow; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function startFunding() {
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/passed-traders/${trader.id}/start-funding`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? `Funded successfully — account ${data.login}` : data.error ?? "Failed to fund.");
      if (res.ok) onUpdated();
    } catch {
      alert("Failed to fund.");
    }
  }

  async function resendCredentials() {
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/passed-traders/${trader.id}/resend-credentials`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? "Credentials email sent." : data.error ?? "Failed to send.");
    } catch {
      alert("Failed to send.");
    }
  }

  const items = [
    { label: "View Purchase", icon: Receipt, action: () => setOpen(false), live: true },
    { label: "Open Inventory Account", icon: Package, action: () => setOpen(false), live: !!trader.fundedAccountLogin },
    { label: "Open VPS", icon: Server, action: () => setOpen(false), live: !!trader.vpsSlot },
    ...(trader.fundingStatus === "stuck" ? [{ label: "Start Funding", icon: RotateCw, action: startFunding, live: true }] : []),
    ...(trader.fundingStatus === "funded" ? [{ label: "Send Credentials Again", icon: Mail, action: resendCredentials, live: true }] : []),
    { label: "Add Internal Note", icon: Receipt, action: () => setOpen(false), live: false },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} onClick={(e) => { e.stopPropagation(); item.action(); }} disabled={!item.live}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${item.live ? "text-zinc-300 hover:bg-white/5" : "cursor-not-allowed text-zinc-600"}`}>
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

function PassedTraderDetailPanel({ challengeId }: { challengeId: string }) {
  const [detail, setDetail] = useState<PassedTraderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/passed-traders/${challengeId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [challengeId]);

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load trader detail.</div>;

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
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Challenge</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Completed: <span className="text-zinc-200">{fmtDateTime(detail.challengeCompletedAt)}</span></p>
            <p className="text-zinc-400">Phase 1: <span className="text-emerald-400">Passed</span></p>
            <p className="text-zinc-400">Phase 2: <span className="text-emerald-400">Passed</span></p>
            <p className="text-zinc-400">Profit Target: <span className="text-emerald-400">Achieved</span></p>
            <p className="text-zinc-400">Rule Violations: <span className="text-zinc-200">{detail.ruleViolationsCount}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Funding</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Status: <span className={detail.fundingStatus === "funded" ? "text-emerald-400" : "text-red-400"}>{detail.fundingStatus === "funded" ? "Funded" : "Needs Manual Funding"}</span></p>
            <p className="text-zinc-400">Account: <span className="font-mono text-zinc-200">{detail.fundedAccount?.login ?? "—"}</span></p>
            <p className="text-zinc-400">VPS: <span className="text-zinc-200">{detail.fundedAccount?.vpsSlot ?? "—"}</span></p>
            <p className="text-zinc-400">Funded At: <span className="text-zinc-200">{fmtDateTime(detail.fundedAt)}</span></p>
            <p className="text-zinc-400">Credentials: <span className={detail.credentialsSent ? "text-emerald-400" : "text-zinc-500"}>{detail.credentialsSent ? "Sent" : "Not Sent"}</span></p>
            <p className="text-zinc-400">Assigned By: <span className="text-zinc-200">{detail.assignedBy}</span></p>
            <p className="text-zinc-600">Internal Notes: {detail.internalNotes}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Funding Workflow</h4>
        <div>
          {detail.workflow.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.errored ? "bg-red-400" : step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                  {step.errored ? <XCircle className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
                </div>
                {i < detail.workflow.length - 1 && <div className={`w-px flex-1 ${step.reached ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "22px" }} />}
              </div>
              <div className="pb-5">
                <p className={`text-sm ${step.errored ? "text-red-400" : step.reached ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
                <p className="text-xs text-zinc-600">{step.timestamp ? fmtDateTime(step.timestamp) : step.errored ? "Failed — no inventory available at that moment" : "Not yet reached"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PassedTradersTable({ initialTraders, initialTotalCount }: { initialTraders: PassedTraderRow[]; initialTotalCount: number }) {
  const [traders, setTraders] = useState(initialTraders);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTraders = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/passed-traders?${params}`)
      .then((r) => r.json())
      .then((data) => { setTraders(data.traders); setTotalCount(data.totalCount); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchTraders(search, filter, page), search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [search, filter, page, fetchTraders]);

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
            placeholder="Search email, username, MT5 login, challenge ID..."
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
      ) : traders.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No traders have completed both evaluation phases yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Traders will automatically appear here after successfully passing Phase 2.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium text-right">Challenge Size</th>
                  <th className="px-4 py-3 font-medium">Passed Date</th>
                  <th className="px-4 py-3 font-medium">Wait Time</th>
                  <th className="px-4 py-3 font-medium">Funding Status</th>
                  <th className="px-4 py-3 font-medium">Inventory Account</th>
                  <th className="px-4 py-3 font-medium">VPS</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {traders.map((t) => (
                  <>
                    <tr key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className={`cursor-pointer border-b border-white/5 hover:bg-white/[0.02] ${t.fundingStatus === "stuck" ? "bg-red-400/[0.03]" : ""}`}>
                      <td className="px-2 py-3 text-zinc-600">{expandedId === t.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-300">{t.full_name ?? "—"}</p>
                        <p className="text-xs text-zinc-600">{t.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(t.accountSize)}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(t.completedAt)}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{fmtDuration(t.waitSeconds)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.fundingStatus === "funded" ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                          {t.fundingStatus === "funded" ? "Funded" : "Needs Manual Funding"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500">{t.fundedAccountLogin ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{t.vpsSlot ?? "—"}</td>
                      <td className="px-2 py-3"><ActionsMenu trader={t} onUpdated={() => fetchTraders(search, filter, page)} /></td>
                    </tr>
                    {expandedId === t.id && (
                      <tr key={`${t.id}-detail`}><td colSpan={9} className="p-0"><PassedTraderDetailPanel challengeId={t.id} /></td></tr>
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
