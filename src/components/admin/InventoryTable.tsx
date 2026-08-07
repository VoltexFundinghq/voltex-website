"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, Server, Users2, Receipt,
  UserPlus, ExternalLink, Trash2, CheckCircle2, Circle, Plus,
} from "lucide-react";
import BulkAddInventoryModal from "./BulkAddInventoryModal";

interface InventoryRow {
  id: string;
  login: string;
  server: string | null;
  paLabel: string | null;
  accountSize: number;
  stage: string;
  assignedTraderName: string | null;
  assignedPhaseLabel: string | null;
  startingBalance: number;
  currentBalance: number | null;
  currentEquity: number | null;
  vpsSlot: string | null;
  vpsStatus: string;
  createdAt: string;
  lastSync: string | null;
  hasLinkedChallenge: boolean;
}

interface LifecycleStep { label: string; timestamp: string | null; reached: boolean; current?: boolean }

interface InventoryDetail {
  account: { login: string; investorPasswordMasked: string; server: string | null; paLabel: string | null; accountSize: number; stage: string; startingBalance: number; currentBalance: number | null; currentEquity: number | null; createdAt: string };
  assignment: { traderName: string | null; traderEmail: string | null; currentPhase: number | null; purchaseReference: string | null; assignedDate: string | null } | null;
  vps: { status: string; slot: string | null; lastHeartbeat: string | null };
  lifecycle: LifecycleStep[];
  fundedInfo: { balanceResetCount: number; lastBalanceReset: string | null; profitSplit: number | null; payoutCount: number } | null;
  retiredInfo: { reason: string; retirementDate: string | null; daysRemaining: number | null } | null;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "phase1", label: "Phase 1" },
  { value: "phase2", label: "Phase 2" },
  { value: "funded", label: "Funded" },
  { value: "retired", label: "Retired" },
  { value: "deleted", label: "Deleted" },
];

const PAGE_SIZE = 20;

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}
function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}
function lastSyncLabel(row: InventoryRow): string {
  if (!row.hasLinkedChallenge) return "Never Connected";
  if (!row.lastSync) return "Waiting First Sync";
  const seconds = Math.floor((Date.now() - new Date(row.lastSync).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
function heartbeatLabel(dateStr: string | null): string {
  if (!dateStr) return "Waiting First Sync";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function stageBadge(stage: string): string {
  if (stage === "Available") return "bg-emerald-400/10 text-emerald-400";
  if (stage === "Phase 1" || stage === "Phase 2") return "bg-blue-400/10 text-blue-400";
  if (stage === "Funded") return "bg-[#D4AF37]/10 text-[#D4AF37]";
  if (stage === "Retired") return "bg-white/5 text-zinc-400";
  if (stage === "Deleted") return "bg-red-400/10 text-red-400";
  return "bg-amber-400/10 text-amber-400";
}

function vpsBadge(status: string): { label: string; className: string } {
  if (status === "monitoring") return { label: "Monitoring", className: "bg-emerald-400/10 text-emerald-400" };
  if (status === "assigned") return { label: "Assigned", className: "bg-blue-400/10 text-blue-400" };
  if (status === "offline") return { label: "Offline", className: "bg-red-400/10 text-red-400" };
  if (status === "error") return { label: "Error", className: "bg-red-400/10 text-red-400" };
  return { label: "Not Assigned", className: "bg-white/5 text-zinc-500" };
}

function AssignModal({ accountId, onClose, onAssigned }: { accountId: string; onClose: () => void; onAssigned: () => void }) {
  const [waiting, setWaiting] = useState<{ challengeId: string; email: string; requestedAt: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/inventory/${accountId}/awaiting-allocation`)
      .then((r) => r.json())
      .then((data) => { setWaiting(data.waiting ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [accountId]);

  async function handleAssign(challengeId: string) {
    setAssigning(challengeId);
    try {
      const res = await fetch(`/api/admin/inventory/${accountId}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId }),
      });
      const data = await res.json();
      alert(res.ok ? `Assigned successfully to login ${data.login}` : data.error ?? "Failed to assign.");
      if (res.ok) { onAssigned(); onClose(); }
    } catch {
      alert("Failed to assign.");
    }
    setAssigning(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0a0a0a] p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white">Assign To Trader</h3>
        <p className="mt-1 text-xs text-zinc-500">Traders currently waiting for allocation at this account's size.</p>
        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : waiting.length === 0 ? (
            <p className="text-sm text-zinc-600">No traders currently waiting for this account size.</p>
          ) : (
            waiting.map((w) => (
              <div key={w.challengeId} className="flex items-center justify-between rounded-lg border border-white/10 p-3 text-sm">
                <div>
                  <p className="text-zinc-300">{w.email}</p>
                  <p className="text-xs text-zinc-600">Waiting since {fmtDateTime(w.requestedAt)}</p>
                </div>
                <button
                  onClick={() => handleAssign(w.challengeId)}
                  disabled={assigning === w.challengeId}
                  className="rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50"
                >
                  {assigning === w.challengeId ? "Assigning..." : "Assign"}
                </button>
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm text-zinc-400 hover:bg-white/5">Close</button>
      </div>
    </div>
  );
}

function ActionsMenu({ account, onUpdated }: { account: InventoryRow; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function retire() {
    setOpen(false);
    if (!confirm(`Retire account ${account.login}?`)) return;
    try {
      const res = await fetch(`/api/admin/inventory/${account.id}/retire`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? "Account retired." : data.error ?? "Failed to retire.");
      if (res.ok) onUpdated();
    } catch { alert("Failed to retire."); }
  }

  async function markDeleted() {
    setOpen(false);
    if (!confirm(`Confirm Exness has genuinely deleted account ${account.login}?`)) return;
    try {
      const res = await fetch(`/api/admin/inventory/${account.id}/mark-deleted`, { method: "POST" });
      const data = await res.json();
      alert(res.ok ? "Marked deleted." : data.error ?? "Failed to mark deleted.");
      if (res.ok) onUpdated();
    } catch { alert("Failed to mark deleted."); }
  }

  async function deleteAccount() {
    setOpen(false);
    if (!confirm(`Permanently remove ${account.login} from Inventory? This only works for accounts with no real trader history, and cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/inventory/${account.id}`, { method: "DELETE" });
      const data = await res.json();
      alert(res.ok ? "Account permanently removed." : data.error ?? "Failed to delete.");
      if (res.ok) onUpdated();
    } catch { alert("Failed to delete."); }
  }

  const canPermanentlyDelete = account.stage === "Available" || account.stage === "Deleted";

  const items = [
    ...(account.stage === "Available" ? [{ label: "Assign To Trader", icon: UserPlus, action: () => { setShowAssign(true); setOpen(false); } }] : []),
    { label: "Open VPS", icon: Server, action: () => setOpen(false) },
    ...(account.assignedTraderName ? [{ label: "View Trader", icon: Users2, action: () => setOpen(false) }, { label: "View Purchase", icon: Receipt, action: () => setOpen(false) }] : []),
    ...(account.stage !== "Retired" && account.stage !== "Deleted" ? [{ label: "Retire Account", icon: ExternalLink, action: retire }] : []),
    ...(account.stage === "Retired" ? [{ label: "Mark Deleted", icon: Trash2, action: markDeleted }] : []),
    ...(canPermanentlyDelete ? [{ label: "Delete Account", icon: Trash2, action: deleteAccount, danger: true }] : []),
  ];

  return (
    <>
      <div className="relative" ref={ref}>
        <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {open && (
          <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
            {items.map((item: any) => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={(e) => { e.stopPropagation(); item.action(); }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-white/5 ${item.danger ? "text-red-400" : "text-zinc-300"}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {showAssign && <AssignModal accountId={account.id} onClose={() => setShowAssign(false)} onAssigned={onUpdated} />}
    </>
  );
}

function InventoryDetailPanel({ accountId }: { accountId: string }) {
  const [detail, setDetail] = useState<InventoryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/inventory/${accountId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [accountId]);

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load account detail.</div>;

  const vBadge = vpsBadge(detail.vps.status);

  return (
    <div className="grid gap-6 bg-black/30 p-6 md:grid-cols-3">
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Account</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">MT5 Login: <span className="font-mono text-zinc-200">{detail.account.login}</span></p>
            <p className="text-zinc-400">Investor Password: <span className="font-mono text-zinc-200">{detail.account.investorPasswordMasked}</span></p>
            <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.account.server ?? "—"}</span></p>
            <p className="text-zinc-400">PA: <span className="text-zinc-200">{detail.account.paLabel ?? "—"}</span></p>
            <p className="text-zinc-400">Size: <span className="text-zinc-200">{fmtMoney(detail.account.accountSize)}</span></p>
            <p className="text-zinc-400">Stage: <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageBadge(detail.account.stage)}`}>{detail.account.stage}</span></p>
            <p className="text-zinc-400">Starting Balance: <span className="text-zinc-200">{fmtMoney(detail.account.startingBalance)}</span></p>
            {detail.account.currentBalance !== null && <p className="text-zinc-400">Current Balance: <span className="text-zinc-200">{fmtMoney(detail.account.currentBalance)}</span></p>}
            {detail.account.currentEquity !== null && <p className="text-zinc-400">Current Equity: <span className="text-zinc-200">{fmtMoney(detail.account.currentEquity)}</span></p>}
            <p className="text-zinc-400">Created: <span className="text-zinc-200">{fmtDate(detail.account.createdAt)}</span></p>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Assignment</h4>
          {detail.assignment ? (
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Trader: <span className="text-zinc-200">{detail.assignment.traderName ?? "—"}</span></p>
              <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.assignment.traderEmail ?? "—"}</span></p>
              <p className="text-zinc-400">Phase: <span className="text-zinc-200">{detail.assignment.currentPhase === 3 ? "Funded" : detail.assignment.currentPhase}</span></p>
              <p className="text-zinc-400">Purchase Ref: <span className="font-mono text-xs text-zinc-500">{detail.assignment.purchaseReference ?? "—"}</span></p>
              <p className="text-zinc-400">Assigned: <span className="text-zinc-200">{fmtDate(detail.assignment.assignedDate)}</span></p>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Available for Provisioning</p>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">VPS</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Status: <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${vBadge.className}`}>{vBadge.label}</span></p>
            <p className="text-zinc-400">VPS Name: <span className="text-zinc-200">{detail.vps.slot ?? "—"}</span></p>
            <p className="text-zinc-400">Last Heartbeat: <span className="text-zinc-200">{heartbeatLabel(detail.vps.lastHeartbeat)}</span></p>
          </div>
        </div>

        {detail.fundedInfo && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Funded Account</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Balance Resets: <span className="text-zinc-200">{detail.fundedInfo.balanceResetCount}</span></p>
              <p className="text-zinc-400">Last Reset: <span className="text-zinc-200">{fmtDateTime(detail.fundedInfo.lastBalanceReset)}</span></p>
              <p className="text-zinc-400">Profit Split: <span className="text-zinc-200">{detail.fundedInfo.profitSplit}%</span></p>
              <p className="text-zinc-400">Payout Count: <span className="text-zinc-200">{detail.fundedInfo.payoutCount}</span></p>
            </div>
          </div>
        )}

        {detail.retiredInfo && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Retirement</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Reason: <span className="text-zinc-200">{detail.retiredInfo.reason}</span></p>
              <p className="text-zinc-400">Retired: <span className="text-zinc-200">{fmtDate(detail.retiredInfo.retirementDate)}</span></p>
              <p className="text-zinc-400">Exness Auto Delete: <span className="text-zinc-200">{detail.retiredInfo.daysRemaining !== null ? (detail.retiredInfo.daysRemaining > 0 ? `${detail.retiredInfo.daysRemaining} Days Remaining` : "Likely Deleted") : "—"}</span></p>
            </div>
          </div>
        )}
      </div>

      <div className="md:col-span-2">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Lifecycle</h4>
        <div>
          {detail.lifecycle.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.current ? "bg-[#D4AF37] ring-2 ring-[#D4AF37]/40" : step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                  {step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
                </div>
                {i < detail.lifecycle.length - 1 && <div className={`w-px flex-1 ${step.reached ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "20px" }} />}
              </div>
              <div className="pb-4">
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

export default function InventoryTable({ initialAccounts, initialTotalCount }: { initialAccounts: InventoryRow[]; initialTotalCount: number }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const fetchAccounts = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/inventory?${params}`)
      .then((r) => r.json())
      .then((data) => { setAccounts(data.accounts); setTotalCount(data.totalCount); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchAccounts(search, filter, page), search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [search, filter, page, fetchAccounts]);

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
            placeholder="Search MT5 login, server, PA, trader..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => handleFilterChange(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.value ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setShowBulkAdd(true)}
            className="ml-2 flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#F5D573]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            Add Accounts
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">Loading...</p></div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No inventory accounts have been added yet.</p>
          <p className="mt-1 text-xs text-zinc-600">Add MT5 accounts to begin provisioning challenges.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">MT5 Login</th>
                  <th className="px-4 py-3 font-medium">Server</th>
                  <th className="px-4 py-3 font-medium">PA</th>
                  <th className="px-4 py-3 font-medium text-right">Size</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium text-right">Starting Bal.</th>
                  <th className="px-4 py-3 font-medium text-right">Current Bal.</th>
                  <th className="px-4 py-3 font-medium">VPS</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last Sync</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const vBadge = vpsBadge(a.vpsStatus);
                  return (
                    <>
                      <tr key={a.id} onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-2 py-3 text-zinc-600">{expandedId === a.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                        <td className="px-4 py-3 font-mono text-zinc-300">{a.login}</td>
                        <td className="px-4 py-3 text-zinc-400">{a.server ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">{a.paLabel ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(a.accountSize)}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${stageBadge(a.stage)}`}>{a.stage}</span></td>
                        <td className="px-4 py-3 text-xs text-zinc-400">
                          {a.assignedTraderName ? (
                            <>
                              <p className="text-zinc-300">{a.assignedTraderName}</p>
                              <p className="text-zinc-600">{a.assignedPhaseLabel}</p>
                            </>
                          ) : "Available"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(a.startingBalance)}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-300">{a.currentBalance !== null ? fmtMoney(a.currentBalance) : "—"}</td>
                        <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${vBadge.className}`}>{vBadge.label}</span></td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(a.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{lastSyncLabel(a)}</td>
                        <td className="px-2 py-3"><ActionsMenu account={a} onUpdated={() => fetchAccounts(search, filter, page)} /></td>
                      </tr>
                      {expandedId === a.id && (
                        <tr key={`${a.id}-detail`}><td colSpan={13} className="p-0"><InventoryDetailPanel accountId={a.id} /></td></tr>
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

      {showBulkAdd && (
        <BulkAddInventoryModal
          onClose={() => setShowBulkAdd(false)}
          onAdded={() => fetchAccounts(search, filter, page)}
        />
      )}
    </div>
  );
}
