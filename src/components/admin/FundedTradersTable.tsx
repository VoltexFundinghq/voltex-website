"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, Server, Receipt, ExternalLink,
  CheckCircle2, XCircle, RotateCw, Circle, Wallet,
} from "lucide-react";

interface FundedTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  account_login: string | null;
  accountSize: number | null;
  balance: number | null;
  equity: number | null;
  floatingPL: number | null;
  profitPercent: number;
  drawdownUsedPercent: number;
  status: "online" | "delayed" | "near_drawdown";
  lastSync: string | null;
  openTrades: number | null;
  lastActivity: string | null;
  vpsSlot: string | null;
  payoutStatus: "none" | "pending" | "approved" | "rejected";
  healthScore: "excellent" | "good" | "warning" | "critical";
}

interface WorkflowStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
  current?: boolean;
}

interface FundedTraderDetail {
  customer: { name: string | null; email: string; username: string | null; country: string | null; phone: string | null };
  funding: { originalChallengeSize: number | null; fundedDate: string | null; fundedAccountSize: number | null; currentStage: string; profitSplit: number; currentCycleNumber: number };
  tradingAccount: {
    mt5Login: string | null; server: string | null; vpsSlot: string | null; balance: number | null; equity: number | null;
    floatingPL: number | null; highestEquity: number | null; currentProfit: number | null; remainingMaxDrawdownPercent: number;
    openTrades: number | null; lastVpsHeartbeat: string | null;
  };
  payouts: { profitEligible: boolean; lastPayout: { amount: number; status: string; requestedAt: string } | null; pendingPayoutAmount: number; totalPaid: number; currentCycleStart: string | null };
  risk: { ruleViolationsCount: number; drawdownUsedPercent: number; riskScore: string; latestAlert: string | null };
  adminNotes: string;
  timeline: WorkflowStep[];
  historicalCycleCount: number;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "near_breach", label: "Near Drawdown" },
  { value: "delayed", label: "Delayed Sync" },
  { value: "online", label: "Online" },
];

const PAGE_SIZE = 50;

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function liveStatusBadge(status: string) {
  if (status === "online") return { label: "Online", className: "bg-emerald-400/10 text-emerald-400" };
  if (status === "delayed") return { label: "Delayed Sync", className: "bg-amber-400/10 text-amber-400" };
  return { label: "Near Drawdown", className: "bg-orange-400/10 text-orange-400" };
}
function healthBadge(score: string) {
  if (score === "excellent") return "bg-emerald-400/10 text-emerald-400";
  if (score === "good") return "bg-blue-400/10 text-blue-400";
  if (score === "warning") return "bg-amber-400/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}
function payoutBadge(status: string) {
  if (status === "pending") return { label: "Pending", className: "bg-amber-400/10 text-amber-400" };
  if (status === "approved") return { label: "Approved", className: "bg-emerald-400/10 text-emerald-400" };
  if (status === "rejected") return { label: "Rejected", className: "bg-red-400/10 text-red-400" };
  return { label: "None", className: "bg-white/5 text-zinc-500" };
}

function ActionsMenu({ trader, onUpdated }: { trader: FundedTraderRow; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function approvePayout() {
    setOpen(false);
    try {
      const res = await fetch(`/api/admin/funded-traders/${trader.id}/approve-payout`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? "Payout approved." : data.error ?? "Failed to approve.");
      if (res.ok) onUpdated();
    } catch { alert("Failed to approve."); }
  }

  async function rejectPayout() {
    setOpen(false);
    const reason = prompt("Reason for rejection (optional):") ?? "";
    try {
      const res = await fetch(`/api/admin/funded-traders/${trader.id}/reject-payout`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      alert(res.ok ? "Payout rejected." : data.error ?? "Failed to reject.");
      if (res.ok) onUpdated();
    } catch { alert("Failed to reject."); }
  }

  async function retireAccount() {
    setOpen(false);
    if (!confirm(`Retire this funded account (${trader.account_login})? This marks it as failed.`)) return;
    try {
      const res = await fetch(`/api/admin/funded-traders/${trader.id}/retire`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? "Account retired." : data.error ?? "Failed to retire.");
      if (res.ok) window.location.reload();
    } catch { alert("Failed to retire."); }
  }

  const items = [
    { label: "View MT5 Account", icon: Wallet, action: () => setOpen(false), live: true },
    { label: "Open VPS", icon: Server, action: () => setOpen(false), live: true },
    { label: "View Purchase", icon: Receipt, action: () => setOpen(false), live: true },
    { label: "View Trading History", icon: Receipt, action: () => setOpen(false), live: true },
    ...(trader.payoutStatus === "pending" ? [
      { label: "Approve Payout", icon: CheckCircle2, action: approvePayout, live: true },
      { label: "Reject Payout", icon: XCircle, action: rejectPayout, live: true },
    ] : []),
    { label: "Reset Balance", icon: RotateCw, action: () => setOpen(false), live: false },
    { label: "Pause Trading", icon: XCircle, action: () => setOpen(false), live: false },
    { label: "Retire Account", icon: ExternalLink, action: retireAccount, live: true },
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

function FundedTraderDetailPanel({ challengeId }: { challengeId: string }) {
  const [detail, setDetail] = useState<FundedTraderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/funded-traders/${challengeId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [challengeId]);

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load trader detail.</div>;

  return (
    <div className="bg-black/30 p-6">
      {detail.historicalCycleCount > 0 && (
        <p className="mb-4 text-xs text-zinc-500">This account has completed {detail.historicalCycleCount} prior payout cycle{detail.historicalCycleCount === 1 ? "" : "s"} — currently on cycle {detail.funding.currentCycleNumber}.</p>
      )}
      <div className="grid gap-6 md:grid-cols-3">
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
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Funding</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Original Challenge: <span className="text-zinc-200">{fmtMoney(detail.funding.originalChallengeSize)}</span></p>
              <p className="text-zinc-400">Funded Date: <span className="text-zinc-200">{fmtDateTime(detail.funding.fundedDate)}</span></p>
              <p className="text-zinc-400">Funded Size: <span className="text-zinc-200">{fmtMoney(detail.funding.fundedAccountSize)}</span></p>
              <p className="text-zinc-400">Profit Split: <span className="text-zinc-200">{detail.funding.profitSplit}%</span></p>
              <p className="text-zinc-400">Current Cycle: <span className="text-zinc-200">#{detail.funding.currentCycleNumber}</span></p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Risk</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Rule Violations: <span className="text-zinc-200">{detail.risk.ruleViolationsCount}</span></p>
              <p className="text-zinc-400">Drawdown Used: <span className="text-zinc-200">{detail.risk.drawdownUsedPercent}%</span></p>
              <p className="text-zinc-400">Risk Score: <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${healthBadge(detail.risk.riskScore)}`}>{detail.risk.riskScore}</span></p>
              <p className="text-zinc-400">Latest Alert: <span className="text-zinc-200">{detail.risk.latestAlert ?? "None"}</span></p>
              <p className="text-zinc-600">Admin Notes: {detail.adminNotes}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trading Account</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">MT5 Login: <span className="font-mono text-zinc-200">{detail.tradingAccount.mt5Login ?? "—"}</span></p>
              <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.tradingAccount.server ?? "—"}</span></p>
              <p className="text-zinc-400">VPS: <span className="text-zinc-200">{detail.tradingAccount.vpsSlot ?? "Not assigned"}</span></p>
              <p className="text-zinc-400">Balance: <span className="text-zinc-200">{fmtMoney(detail.tradingAccount.balance)}</span></p>
              <p className="text-zinc-400">Equity: <span className="text-zinc-200">{fmtMoney(detail.tradingAccount.equity)}</span></p>
              <p className="text-zinc-400">Highest Equity: <span className="text-zinc-200">{fmtMoney(detail.tradingAccount.highestEquity)}</span></p>
              <p className="text-zinc-400">Floating P/L: <span className={detail.tradingAccount.floatingPL !== null && detail.tradingAccount.floatingPL < 0 ? "text-red-400" : "text-emerald-400"}>{fmtMoney(detail.tradingAccount.floatingPL)}</span></p>
              <p className="text-zinc-400">Current Profit: <span className={detail.tradingAccount.currentProfit !== null && detail.tradingAccount.currentProfit < 0 ? "text-red-400" : "text-emerald-400"}>{fmtMoney(detail.tradingAccount.currentProfit)}</span></p>
              <p className="text-zinc-400">Remaining Max Drawdown: <span className="text-zinc-200">{detail.tradingAccount.remainingMaxDrawdownPercent}%</span></p>
              <p className="text-zinc-400">Open Trades: <span className="text-zinc-200">{detail.tradingAccount.openTrades ?? "—"}</span></p>
              <p className="text-zinc-400">Last Heartbeat: <span className="text-zinc-200">{timeAgo(detail.tradingAccount.lastVpsHeartbeat)}</span></p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Payouts</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Profit Eligible: <span className={detail.payouts.profitEligible ? "text-emerald-400" : "text-zinc-500"}>{detail.payouts.profitEligible ? "Yes" : "No"}</span></p>
              <p className="text-zinc-400">Last Payout: <span className="text-zinc-200">{detail.payouts.lastPayout ? `₦${detail.payouts.lastPayout.amount.toLocaleString()} (${detail.payouts.lastPayout.status})` : "None"}</span></p>
              <p className="text-zinc-400">Pending: <span className="text-zinc-200">{fmtMoney(detail.payouts.pendingPayoutAmount)}</span></p>
              <p className="text-zinc-400">Total Paid: <span className="text-zinc-200">{fmtMoney(detail.payouts.totalPaid)}</span></p>
              <p className="text-zinc-400">Cycle Start: <span className="text-zinc-200">{fmtDateTime(detail.payouts.currentCycleStart)}</span></p>
              <p className="text-zinc-400">Cycle End: <span className="text-zinc-600">Ongoing</span></p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timeline (Current Cycle)</h4>
          <div>
            {detail.timeline.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.current ? "bg-[#D4AF37] ring-2 ring-[#D4AF37]/40" : step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                    {step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
                  </div>
                  {i < detail.timeline.length - 1 && <div className={`w-px flex-1 ${step.reached ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "22px" }} />}
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
    </div>
  );
}

export default function FundedTradersTable({ initialTraders, initialTotalCount }: { initialTraders: FundedTraderRow[]; initialTotalCount: number }) {
  const [traders, setTraders] = useState(initialTraders);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTraders = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    if (filterVal !== "all") params.set("status", filterVal);
    fetch(`/api/admin/funded-traders?${params}`)
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
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search email, username, MT5 login..."
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
          <p className="text-zinc-500">No funded traders yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Traders will automatically appear here after successfully completing evaluation and receiving a funded account.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium">MT5 Login</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                  <th className="px-4 py-3 font-medium text-right">Equity</th>
                  <th className="px-4 py-3 font-medium text-right">Floating P/L</th>
                  <th className="px-4 py-3 font-medium text-right">Profit %</th>
                  <th className="px-4 py-3 font-medium">Drawdown Used</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payout</th>
                  <th className="px-4 py-3 font-medium">Open Trades</th>
                  <th className="px-4 py-3 font-medium">Last Sync</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {traders.map((t) => {
                  const statusBadge = liveStatusBadge(t.status);
                  const pBadge = payoutBadge(t.payoutStatus);
                  return (
                    <>
                      <tr key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-2 py-3 text-zinc-600">{expandedId === t.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-300">{t.full_name ?? "—"}</p>
                          <p className="text-xs text-zinc-600">{t.email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">{t.account_login ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(t.balance)}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(t.equity)}</td>
                        <td className={`px-4 py-3 text-right font-mono ${t.floatingPL !== null && t.floatingPL < 0 ? "text-red-400" : "text-emerald-400"}`}>{fmtMoney(t.floatingPL)}</td>
                        <td className={`px-4 py-3 text-right font-mono ${t.profitPercent < 0 ? "text-red-400" : "text-emerald-400"}`}>{t.profitPercent}%</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.drawdownUsedPercent >= 75 ? "bg-red-400/10 text-red-400" : "bg-white/5 text-zinc-400"}`}>{t.drawdownUsedPercent}%</span></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}>{statusBadge.label}</span></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${pBadge.className}`}>{pBadge.label}</span></td>
                        <td className="px-4 py-3 text-zinc-400">{t.openTrades ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{timeAgo(t.lastSync)}</td>
                        <td className="px-2 py-3"><ActionsMenu trader={t} onUpdated={() => fetchTraders(search, filter, page)} /></td>
                      </tr>
                      {expandedId === t.id && (
                        <tr key={`${t.id}-detail`}><td colSpan={13} className="p-0"><FundedTraderDetailPanel challengeId={t.id} /></td></tr>
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
