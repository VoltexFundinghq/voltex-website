"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, Receipt, ShieldAlert, Server,
  FileText, CheckCircle2, Circle,
} from "lucide-react";

interface FailedTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  accountSize: number | null;
  failureReason: string;
  phase: number;
  failedAt: string | null;
  daysSinceFailed: number | null;
  accountLogin: string | null;
  retirementStatus: "not_yet_reset" | "counting_down" | "likely_deleted";
  estimatedDeleteDate: string | null;
  daysRemaining: number | null;
}

interface WorkflowStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  current?: boolean;
}

interface FailedTraderDetail {
  customer: { name: string | null; email: string; username: string | null; country: string | null; phone: string | null };
  challenge: {
    challengeSize: number | null; purchaseDate: string | null; phaseReached: number;
    startingBalance: number | null; finalBalance: number | null; finalEquity: number | null; highestEquity: number | null;
  };
  failure: {
    reason: string; dailyDrawdownBreached: boolean; maxDrawdownBreached: boolean; profitTargetMissed: boolean;
    manualFailure: boolean; systemFailure: boolean; timestamp: string | null; lastVpsHeartbeat: string | null;
  };
  account: {
    inventoryLogin: string | null; server: string | null; vpsSlot: string | null; provisionDate: string | null;
    retirementDate: string | null; estimatedDeleteDate: string | null; currentInventoryStatus: string;
  };
  ruleViolationsCount: number;
  adminNotes: string;
  reviewed: boolean;
  workflow: WorkflowStep[];
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "phase1", label: "Phase 1" },
  { value: "phase2", label: "Phase 2" },
  { value: "failed_today", label: "Failed Today" },
  { value: "failed_week", label: "Failed This Week" },
  { value: "awaiting_deletion", label: "Awaiting Deletion" },
  { value: "deleted", label: "Deleted" },
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
function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function retirementBadge(status: string) {
  if (status === "counting_down") return { label: "Counting Down", className: "bg-amber-400/10 text-amber-400" };
  if (status === "likely_deleted") return { label: "Likely Deleted", className: "bg-white/5 text-zinc-500" };
  return { label: "Not Yet Reset", className: "bg-red-400/10 text-red-400" };
}

function ActionsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const items = [
    { label: "View Purchase", icon: Receipt, live: true },
    { label: "View Risk History", icon: ShieldAlert, live: true },
    { label: "View VPS Logs", icon: Server, live: false },
    { label: "View Audit Logs", icon: FileText, live: false },
    { label: "Add Internal Note", icon: FileText, live: false },
    { label: "Mark As Reviewed", icon: CheckCircle2, live: false },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} onClick={(e) => { e.stopPropagation(); setOpen(false); }} disabled={!item.live}
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

function FailedTraderDetailPanel({ challengeId }: { challengeId: string }) {
  const [detail, setDetail] = useState<FailedTraderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/failed-traders/${challengeId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [challengeId]);

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load trader detail.</div>;

  return (
    <div className="grid gap-6 bg-black/30 p-6 md:grid-cols-3">
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Customer</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.customer.name ?? "—"}</span></p>
            <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.customer.email}</span></p>
            <p className="text-zinc-400">Username: <span className="text-zinc-200">{detail.customer.username ?? "—"}</span></p>
            <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.customer.country ?? "—"}</span></p>
            <p className="text-zinc-400">Phone: <span className="text-zinc-200">{detail.customer.phone ?? "—"}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Challenge</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Size: <span className="text-zinc-200">{fmtMoney(detail.challenge.challengeSize)}</span></p>
            <p className="text-zinc-400">Purchased: <span className="text-zinc-200">{fmtDate(detail.challenge.purchaseDate)}</span></p>
            <p className="text-zinc-400">Phase Reached: <span className="text-zinc-200">{detail.challenge.phaseReached}</span></p>
            <p className="text-zinc-400">Starting Balance: <span className="text-zinc-200">{fmtMoney(detail.challenge.startingBalance)}</span></p>
            <p className="text-zinc-400">Final Balance: <span className="text-zinc-200">{fmtMoney(detail.challenge.finalBalance)}</span></p>
            <p className="text-zinc-400">Final Equity: <span className="text-zinc-200">{fmtMoney(detail.challenge.finalEquity)}</span></p>
            <p className="text-zinc-400">Highest Equity: <span className="text-zinc-200">{fmtMoney(detail.challenge.highestEquity)}</span></p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Failure Information</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Reason: <span className="text-red-400">{detail.failure.reason}</span></p>
            <p className="text-zinc-400">Daily Drawdown: <span className="text-zinc-600">Not applicable — no daily drawdown rule exists</span></p>
            <p className="text-zinc-400">Max Drawdown Breached: <span className="text-zinc-200">{detail.failure.maxDrawdownBreached ? "Yes" : "No"}</span></p>
            <p className="text-zinc-400">Profit Target Missed: <span className="text-zinc-200">{detail.failure.profitTargetMissed ? "Yes" : "No"}</span></p>
            <p className="text-zinc-400">System Failure: <span className="text-zinc-200">{detail.failure.systemFailure ? "Yes" : "No"}</span></p>
            <p className="text-zinc-400">Timestamp: <span className="text-zinc-200">{fmtDateTime(detail.failure.timestamp)}</span></p>
            <p className="text-zinc-400">Last VPS Heartbeat: <span className="text-zinc-200">{fmtDateTime(detail.failure.lastVpsHeartbeat)}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Account</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Login: <span className="font-mono text-zinc-200">{detail.account.inventoryLogin ?? "—"}</span></p>
            <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.account.server ?? "—"}</span></p>
            <p className="text-zinc-400">VPS: <span className="text-zinc-200">{detail.account.vpsSlot ?? "—"}</span></p>
            <p className="text-zinc-400">Provisioned: <span className="text-zinc-200">{fmtDate(detail.account.provisionDate)}</span></p>
            <p className="text-zinc-400">Retired: <span className="text-zinc-200">{fmtDate(detail.account.retirementDate)}</span></p>
            <p className="text-zinc-400">Est. Delete Date: <span className="text-zinc-200">{fmtDate(detail.account.estimatedDeleteDate)}</span></p>
            <p className="text-zinc-400">Inventory Status: <span className="text-zinc-200">{detail.account.currentInventoryStatus}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Audit</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Rule Violations: <span className="text-zinc-200">{detail.ruleViolationsCount}</span></p>
            <p className="text-zinc-600">Admin Notes: {detail.adminNotes}</p>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Failure Timeline</h4>
        <div>
          {detail.workflow.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.current ? "bg-[#D4AF37] ring-2 ring-[#D4AF37]/40" : step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                  {step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
                </div>
                {i < detail.workflow.length - 1 && <div className={`w-px flex-1 ${step.reached ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "22px" }} />}
              </div>
              <div className="pb-5">
                <p className={`text-sm ${step.current ? "font-medium text-[#D4AF37]" : step.reached ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
                <p className="text-xs text-zinc-600">{step.timestamp ? fmtDateTime(step.timestamp) : "Not yet reached"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FailedTradersTable({ initialTraders, initialTotalCount }: { initialTraders: FailedTraderRow[]; initialTotalCount: number }) {
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
    fetch(`/api/admin/failed-traders?${params}`)
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
            placeholder="Search trader, email, username, MT5 login, challenge ID..."
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
          <p className="text-zinc-500">No failed challenge accounts.</p>
          <p className="mt-1 text-xs text-zinc-600">Accounts that fail evaluation will automatically appear here until Exness permanently deletes them after 21 days.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium text-right">Size</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Phase</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Retirement</th>
                  <th className="px-4 py-3 font-medium">Deletion</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {traders.map((t) => {
                  const badge = retirementBadge(t.retirementStatus);
                  return (
                    <>
                      <tr key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-2 py-3 text-zinc-600">{expandedId === t.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-300">{t.full_name ?? "—"}</p>
                          <p className="text-xs text-zinc-600">{t.email}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(t.accountSize)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400">{t.failureReason}</td>
                        <td className="px-4 py-3 text-zinc-400">{t.phase}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{t.daysSinceFailed !== null ? `${t.daysSinceFailed}d ago` : "—"}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span></td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{t.daysRemaining !== null ? (t.daysRemaining > 0 ? `~${t.daysRemaining}d left` : "likely deleted") : "—"}</td>
                        <td className="px-2 py-3"><ActionsMenu /></td>
                      </tr>
                      {expandedId === t.id && (
                        <tr key={`${t.id}-detail`}><td colSpan={9} className="p-0"><FailedTraderDetailPanel challengeId={t.id} /></td></tr>
                      )}
                    </>
                  );
                })}
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
