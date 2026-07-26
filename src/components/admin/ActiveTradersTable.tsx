"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, User, Receipt, Wallet,
  Server, ExternalLink, ShieldAlert, DollarSign, CheckCircle2, Wifi, WifiOff, Clock,
} from "lucide-react";

interface ActiveTraderRow {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  account_login: string | null;
  accountSize: number | null;
  currentPhase: number;
  status: string;
  balance: number | null;
  equity: number | null;
  dailyPL: number | null;
  drawdownUsedPercent: number;
  profitPercent: number;
  lastSync: string | null;
  openTrades: number | null;
  vpsSlot: string | null;
  liveStatus: "online" | "delayed" | "near_drawdown";
  healthScore: "excellent" | "good" | "warning" | "critical";
}

interface TimelineStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
}

interface ActiveTraderDetail {
  trader: { name: string | null; email: string; username: string | null; country: string | null };
  challenge: { accountSize: number | null; phase: number; startDate: string | null; status: string; provisionedAt: string | null };
  tradingAccount: { mt5LoginMasked: string | null; passwordMasked: string; server: string | null; broker: string | null; vpsSlot: string | null };
  performance: {
    balance: number | null; equity: number | null; peakClosedBalance: number | null; floatingPL: number | null;
    totalProfit: number | null; dailyPL: number | null; drawdownUsedPercent: number; profitTargetProgressPercent: number;
    maxDrawdownRemainingPercent: number; profitTargetPercent: number; fixedAllowedLossAmount: number | null;
  };
  latestRiskEvent: string | null;
  latestPayoutRequest: { amount: number; status: string; requestedAt: string } | null;
  latestAdminNote: string;
  timeline: TimelineStep[];
  liveStatus: { online: boolean; lastSync: string | null };
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "phase1", label: "Phase 1" },
  { value: "phase2", label: "Phase 2" },
  { value: "funded", label: "Funded" },
  { value: "near_breach", label: "Near Breach" },
  { value: "in_profit", label: "In Profit" },
  { value: "in_drawdown", label: "Drawdown" },
  { value: "delayed", label: "Delayed Sync" },
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

function ProgressBar({ percent, tone }: { percent: number; tone: "gold" | "danger" }) {
  const barColor = tone === "danger" ? (percent >= 75 ? "bg-red-400" : percent >= 50 ? "bg-amber-400" : "bg-emerald-400") : "bg-[#D4AF37]";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}

function ActionsMenu({ trader }: { trader: ActiveTraderRow }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function retireAccount() {
    setOpen(false);
    if (!confirm(`Retire this account (${trader.account_login})? This marks the challenge as failed.`)) return;
    try {
      const res = await fetch(`/api/admin/active-traders/${trader.id}/retire`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? "Account retired." : data.error ?? "Failed to retire.");
      if (res.ok) window.location.reload();
    } catch {
      alert("Failed to retire.");
    }
  }

  const items = [
    { label: "View User", icon: User, action: () => setOpen(false), live: true },
    { label: "View Purchase", icon: Receipt, action: () => setOpen(false), live: true },
    { label: "View Trading Account", icon: Wallet, action: () => setOpen(false), live: true },
    { label: "Open VPS Details", icon: Server, action: () => setOpen(false), live: true },
    { label: "Suspend Trader", icon: ShieldAlert, action: () => setOpen(false), live: false },
    { label: "Retire Account", icon: ExternalLink, action: retireAccount, live: true },
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

function TraderDetailPanel({ challengeId }: { challengeId: string }) {
  const [detail, setDetail] = useState<ActiveTraderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/active-traders/${challengeId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [challengeId]);

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load trader detail.</div>;

  return (
    <div className="bg-black/30 p-6">
      <div className="mb-4 flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
        {detail.liveStatus.online ? <Wifi className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.75} /> : <WifiOff className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.75} />}
        <span className={`text-xs font-medium ${detail.liveStatus.online ? "text-emerald-400" : "text-zinc-500"}`}>{detail.liveStatus.online ? "Online" : "Offline"}</span>
        <span className="text-xs text-zinc-600">· Last sync {timeAgo(detail.liveStatus.lastSync)}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
              <p className="text-zinc-400">Phase: <span className="text-zinc-200">{detail.challenge.phase === 3 ? "Funded" : detail.challenge.phase}</span></p>
              <p className="text-zinc-400">Provisioned: <span className="text-zinc-200">{fmtDateTime(detail.challenge.provisionedAt)}</span></p>
              <p className="text-zinc-400">Status: <span className="text-zinc-200">{detail.challenge.status}</span></p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trading Account (masked)</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">MT5 Login: <span className="font-mono text-zinc-200">{detail.tradingAccount.mt5LoginMasked}</span></p>
              <p className="text-zinc-400">Password: <span className="font-mono text-zinc-200">{detail.tradingAccount.passwordMasked}</span></p>
              <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.tradingAccount.server ?? "—"}</span></p>
              <p className="text-zinc-400">Broker: <span className="text-zinc-200">{detail.tradingAccount.broker ?? "—"}</span></p>
              <p className="text-zinc-400">VPS: <span className="text-zinc-200">{detail.tradingAccount.vpsSlot ?? "Not assigned"}</span></p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Performance</h4>
          <div className="space-y-2 text-sm">
            <p className="text-zinc-400">Balance: <span className="text-zinc-200">{fmtMoney(detail.performance.balance)}</span></p>
            <p className="text-zinc-400">Equity: <span className="text-zinc-200">{fmtMoney(detail.performance.equity)}</span></p>
            <p className="text-zinc-400">Highest Equity: <span className="text-zinc-200">{fmtMoney(detail.performance.peakClosedBalance)}</span></p>
            <p className="text-zinc-400">Floating P/L: <span className={detail.performance.floatingPL !== null && detail.performance.floatingPL < 0 ? "text-red-400" : "text-emerald-400"}>{fmtMoney(detail.performance.floatingPL)}</span></p>
            <p className="text-zinc-400">Total Profit: <span className={detail.performance.totalProfit !== null && detail.performance.totalProfit < 0 ? "text-red-400" : "text-emerald-400"}>{fmtMoney(detail.performance.totalProfit)}</span></p>
          </div>

          <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trading Progress</h4>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Profit Target ({detail.performance.profitTargetPercent}%)</span><span>{detail.performance.profitTargetProgressPercent}%</span></div>
              <ProgressBar percent={detail.performance.profitTargetProgressPercent} tone="gold" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Max Drawdown Remaining</span><span>{detail.performance.maxDrawdownRemainingPercent}%</span></div>
              <ProgressBar percent={100 - detail.performance.maxDrawdownRemainingPercent} tone="danger" />
            </div>
          </div>
          {detail.performance.fixedAllowedLossAmount !== null && (
            <p className="mt-3 text-xs text-zinc-600">Fixed allowed loss: {fmtMoney(detail.performance.fixedAllowedLossAmount)} (never grows, per our drawdown model)</p>
          )}

          <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Latest Events</h4>
          <div className="space-y-1.5 text-sm">
            <p className="text-zinc-400">Risk Event: <span className="text-zinc-200">{detail.latestRiskEvent ?? "None"}</span></p>
            <p className="text-zinc-400">Payout Request: <span className="text-zinc-200">{detail.latestPayoutRequest ? `₦${detail.latestPayoutRequest.amount.toLocaleString()} (${detail.latestPayoutRequest.status})` : "None"}</span></p>
            <p className="text-zinc-400">Admin Note: <span className="text-zinc-600">{detail.latestAdminNote}</span></p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timeline</h4>
          <div>
            {detail.timeline.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                    {step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Clock className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
                  </div>
                  {i < detail.timeline.length - 1 && <div className={`w-px flex-1 ${step.reached ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "22px" }} />}
                </div>
                <div className="pb-5">
                  <p className={`text-sm ${step.reached ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
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

export default function ActiveTradersTable({ initialTraders, initialTotalCount }: { initialTraders: ActiveTraderRow[]; initialTotalCount: number }) {
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
    if (filterVal === "phase1" || filterVal === "phase2" || filterVal === "funded") params.set("phase", filterVal);
    else if (filterVal === "near_breach") params.set("status", "near_breach");
    else if (filterVal === "delayed") params.set("status", "delayed");
    else if (filterVal === "in_profit") params.set("profitability", "in_profit");
    else if (filterVal === "in_drawdown") params.set("profitability", "in_drawdown");

    fetch(`/api/admin/active-traders?${params}`)
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
          <p className="text-zinc-500">No active traders currently.</p>
          <p className="mt-1 text-xs text-zinc-600">Newly provisioned challenge accounts will appear here automatically after successful provisioning.</p>
          <a href="/admin/purchases" className="mt-3 inline-block text-xs text-[#D4AF37] hover:underline">View Purchases →</a>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium">Challenge</th>
                  <th className="px-4 py-3 font-medium text-right">Balance</th>
                  <th className="px-4 py-3 font-medium text-right">Equity</th>
                  <th className="px-4 py-3 font-medium">Drawdown Used</th>
                  <th className="px-4 py-3 font-medium">Health</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">VPS</th>
                  <th className="px-4 py-3 font-medium">Last Sync</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {traders.map((t) => {
                  const statusBadge = liveStatusBadge(t.liveStatus);
                  return (
                    <>
                      <tr key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-2 py-3 text-zinc-600">{expandedId === t.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                        <td className="px-4 py-3">
                          <p className="text-zinc-300">{t.full_name ?? "—"}</p>
                          <p className="text-xs text-zinc-600">{t.email}</p>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{t.status} · {fmtMoney(t.accountSize)}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(t.balance)}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(t.equity)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${t.drawdownUsedPercent >= 75 ? "bg-red-400/10 text-red-400" : "bg-white/5 text-zinc-400"}`}>{t.drawdownUsedPercent}%</span>
                        </td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${healthBadge(t.healthScore)}`}>{t.healthScore}</span></td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge.className}`}>{statusBadge.label}</span></td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">{t.vpsSlot ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{timeAgo(t.lastSync)}</td>
                        <td className="px-2 py-3"><ActionsMenu trader={t} /></td>
                      </tr>
                      {expandedId === t.id && (
                        <tr key={`${t.id}-detail`}><td colSpan={11} className="p-0"><TraderDetailPanel challengeId={t.id} /></td></tr>
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
