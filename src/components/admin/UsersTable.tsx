"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, Ban, CheckCircle2, Mail, Key,
  FileText, Eye, Wallet, RotateCw,
} from "lucide-react";

interface UserListRow {
  id: string;
  full_name: string | null;
  email: string;
  username: string | null;
  country: string | null;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
  currentChallengeLabel: string;
  totalPurchases: number;
  lifetimeSpend: number;
  lastActivity: string | null;
}

interface UserDetail {
  profile: {
    id: string; full_name: string | null; email: string; username: string | null;
    country: string | null; phone: string | null; created_at: string; last_sign_in_at: string | null;
  };
  challengeHistory: {
    id: string; challenge_size: string; account_size: number | null; created_at: string;
    completed_at: string | null; current_phase: number; status: string; account_login: string | null;
  }[];
  financialSummary: {
    lifetimeSpend: number; totalPurchases: number; activeChallenges: number; passedChallenges: number;
    failedChallenges: number; fundedAccounts: number; totalPayouts: number; pendingPayouts: number;
    lastPurchaseDate: string | null;
  };
  tradingAccounts: {
    account_login: string | null; broker: string | null; server: string | null; pa_label: string | null;
    status: string; assigned_at: string | null; last_reset_at: string | null;
    vpsSlotLabel: string | null; vpsHealthy: boolean | null;
  }[];
  isAwaitingProvisioning: boolean;
}

const FILTERS = [
  { value: "all", label: "All Users" },
  { value: "active", label: "Active Traders" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "funded", label: "Funded" },
  { value: "suspended", label: "Suspended" },
  { value: "pending_provisioning", label: "Pending Provisioning" },
];

const TABS = ["Profile", "Challenges", "Trading Accounts", "Financial", "Audit Log"] as const;
type Tab = (typeof TABS)[number];

const PAGE_SIZE = 20;

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
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

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  if (["active", "passed", "funded", "available"].includes(s)) return "bg-emerald-400/10 text-emerald-400";
  if (["assigned"].includes(s)) return "bg-blue-400/10 text-blue-400";
  if (["awaiting_allocation", "pending", "resetting"].includes(s)) return "bg-amber-400/10 text-amber-400";
  if (["failed", "suspended"].includes(s)) return "bg-red-400/10 text-red-400";
  return "bg-white/5 text-zinc-400";
}

function resultLabel(status: string, phase: number): string {
  if (status === "active" && phase === 3) return "Funded";
  if (status === "active") return `In Progress — Phase ${phase}`;
  return status;
}

function ActionsMenu({
  user,
  isAwaitingProvisioning,
  onSuspendToggle,
  onRetryProvisioning,
}: {
  user: UserListRow;
  isAwaitingProvisioning: boolean;
  onSuspendToggle: (id: string, suspend: boolean) => void;
  onRetryProvisioning: (id: string) => void;
}) {
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
    { label: "View Purchases", icon: FileText, action: () => setOpen(false), live: true },
    { label: "View Trading Accounts", icon: Wallet, action: () => setOpen(false), live: true },
    ...(isAwaitingProvisioning ? [{ label: "Provision Account", icon: RotateCw, action: () => { onRetryProvisioning(user.id); setOpen(false); }, live: true }] : []),
    user.is_suspended
      ? { label: "Activate User", icon: CheckCircle2, action: () => { onSuspendToggle(user.id, false); setOpen(false); }, live: true }
      : { label: "Suspend User", icon: Ban, action: () => { onSuspendToggle(user.id, true); setOpen(false); }, live: true },
    { label: "Reset Password", icon: Key, action: () => setOpen(false), live: false },
    { label: "Send Email", icon: Mail, action: () => setOpen(false), live: false },
    { label: "View Audit Log", icon: Eye, action: () => setOpen(false), live: false },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"
      >
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={(e) => { e.stopPropagation(); item.action(); }}
                disabled={!item.live}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm ${
                  item.live ? "text-zinc-300 hover:bg-white/5" : "cursor-not-allowed text-zinc-600"
                }`}
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

function UserDetailPanel({ userId, onProvisioned }: { userId: string; onProvisioned: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Profile");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  async function handleRetryProvisioning() {
    setProvisioning(true);
    setProvisionMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/retry-provisioning`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setProvisionMsg("Account allocated successfully.");
        onProvisioned();
      } else {
        setProvisionMsg(data.error ?? "Failed to provision.");
      }
    } catch {
      setProvisionMsg("Failed to provision.");
    }
    setProvisioning(false);
  }

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading profile...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load user detail.</div>;

  return (
    <div className="bg-black/30">
      <div className="flex gap-1 border-b border-white/10 px-6 pt-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-t-lg px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab ? "border-b-2 border-[#D4AF37] text-[#D4AF37]" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "Profile" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5 text-sm">
              <p className="text-zinc-400">Full Name: <span className="text-zinc-200">{detail.profile.full_name ?? "—"}</span></p>
              <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.profile.email}</span></p>
              <p className="text-zinc-400">Username: <span className="text-zinc-200">{detail.profile.username ?? "—"}</span></p>
              <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.profile.country ?? "—"}</span></p>
              <p className="text-zinc-400">Phone: <span className="text-zinc-200">{detail.profile.phone ?? "—"}</span></p>
              <p className="text-zinc-400">Registered: <span className="text-zinc-200">{fmtDate(detail.profile.created_at)}</span></p>
              <p className="text-zinc-400">Last Login: <span className="text-zinc-200">{fmtDateTime(detail.profile.last_sign_in_at)}</span></p>
              <p className="font-mono text-xs text-zinc-600">ID: {detail.profile.id}</p>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Admin Actions</h4>
              <div className="flex flex-wrap gap-2">
                {detail.isAwaitingProvisioning && (
                  <button
                    onClick={handleRetryProvisioning}
                    disabled={provisioning}
                    className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1.5 text-xs font-medium text-[#D4AF37] hover:bg-[#D4AF37]/20 disabled:opacity-50"
                  >
                    {provisioning ? "Provisioning..." : "Provision Account"}
                  </button>
                )}
                <button disabled className="cursor-not-allowed rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-600">Reset Password (soon)</button>
                <button disabled className="cursor-not-allowed rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-600">Send Email (soon)</button>
              </div>
              {provisionMsg && <p className="mt-2 text-xs text-zinc-400">{provisionMsg}</p>}
            </div>
          </div>
        )}

        {activeTab === "Challenges" && (
          detail.challengeHistory.length === 0 ? (
            <p className="text-sm text-zinc-600">No challenges yet.</p>
          ) : (
            <div className="space-y-2">
              {detail.challengeHistory.map((c) => (
                <div key={c.id} className="rounded-lg border border-white/10 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-200">{c.account_size ? `₦${c.account_size.toLocaleString()}` : c.challenge_size}</p>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${statusBadge(c.status)}`}>{resultLabel(c.status, c.current_phase)}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-zinc-500 sm:grid-cols-4">
                    <span>Purchased: <span className="text-zinc-300">{fmtDate(c.created_at)}</span></span>
                    <span>MT5: <span className="font-mono text-zinc-300">{c.account_login ?? "—"}</span></span>
                    <span>Phase: <span className="text-zinc-300">{c.current_phase}</span></span>
                    <span>Completed: <span className="text-zinc-300">{fmtDate(c.completed_at)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "Trading Accounts" && (
          detail.tradingAccounts.length === 0 ? (
            <p className="text-sm text-zinc-600">No trading accounts linked.</p>
          ) : (
            <div className="space-y-2">
              {detail.tradingAccounts.map((a, i) => (
                <div key={i} className="rounded-lg border border-white/10 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm text-zinc-200">{a.account_login ?? "—"}</p>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${statusBadge(a.status)}`}>{a.status}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1 text-zinc-500 sm:grid-cols-3">
                    <span>Broker: <span className="text-zinc-300">{a.broker ?? "—"}</span></span>
                    <span>Server: <span className="text-zinc-300">{a.server ?? "—"}</span></span>
                    <span>PA: <span className="text-zinc-300">{a.pa_label ?? "—"}</span></span>
                    <span>Assigned: <span className="text-zinc-300">{fmtDate(a.assigned_at)}</span></span>
                    <span>Last Reset: <span className="text-zinc-300">{fmtDate(a.last_reset_at)}</span></span>
                    <span>VPS: <span className="text-zinc-300">
                      {a.vpsSlotLabel ? `${a.vpsSlotLabel} (${a.vpsHealthy ? "healthy" : "stale"})` : "Not assigned"}
                    </span></span>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-700">MetaAPI Status: Not implemented — not part of our architecture</p>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === "Financial" && (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <p className="text-zinc-400">Lifetime Spend: <span className="text-zinc-200">₦{detail.financialSummary.lifetimeSpend.toLocaleString()}</span></p>
            <p className="text-zinc-400">Total Purchases: <span className="text-zinc-200">{detail.financialSummary.totalPurchases}</span></p>
            <p className="text-zinc-400">Active: <span className="text-zinc-200">{detail.financialSummary.activeChallenges}</span></p>
            <p className="text-zinc-400">Passed: <span className="text-zinc-200">{detail.financialSummary.passedChallenges}</span></p>
            <p className="text-zinc-400">Failed: <span className="text-zinc-200">{detail.financialSummary.failedChallenges}</span></p>
            <p className="text-zinc-400">Funded: <span className="text-zinc-200">{detail.financialSummary.fundedAccounts}</span></p>
            <p className="text-zinc-400">Total Payouts: <span className="text-zinc-200">₦{detail.financialSummary.totalPayouts.toLocaleString()}</span></p>
            <p className="text-zinc-400">Pending Payouts: <span className="text-zinc-200">₦{detail.financialSummary.pendingPayouts.toLocaleString()}</span></p>
            <p className="text-zinc-400">Last Purchase: <span className="text-zinc-200">{fmtDate(detail.financialSummary.lastPurchaseDate)}</span></p>
          </div>
        )}

        {activeTab === "Audit Log" && (
          <p className="text-sm text-zinc-600">Audit logging isn't built yet — this tab will show every admin action taken on this account once it exists.</p>
        )}
      </div>
    </div>
  );
}

export default function UsersTable({ initialUsers, initialTotalCount }: { initialUsers: UserListRow[]; initialTotalCount: number }) {
  const [users, setUsers] = useState(initialUsers);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingProvisioningIds, setAwaitingProvisioningIds] = useState<Set<string>>(new Set());

  const fetchUsers = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);

    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users);
        setTotalCount(data.totalCount);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchUsers(search, filter, page), search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [search, filter, page, fetchUsers]);

  useEffect(() => {
    if (filter === "pending_provisioning") {
      setAwaitingProvisioningIds(new Set(users.map((u) => u.id)));
    }
  }, [filter, users]);

  function handleFilterChange(f: string) {
    setFilter(f);
    setPage(1);
  }

  async function handleSuspendToggle(userId: string, suspend: boolean) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_suspended: suspend } : u)));
    try {
      await fetch(`/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspend }),
      });
    } catch {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_suspended: !suspend } : u)));
    }
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
            placeholder="Search name, email, username, ID, MT5 login, challenge ID..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">Loading...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No users match this search or filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Name / Email</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Country</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Current Challenge</th>
                  <th className="px-4 py-3 font-medium text-right">Purchases</th>
                  <th className="px-4 py-3 font-medium text-right">Lifetime Spend</th>
                  <th className="px-4 py-3 font-medium">Last Activity</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <>
                    <tr
                      key={u.id}
                      onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
                      className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-2 py-3 text-zinc-600">
                        {expandedId === u.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-300">{u.full_name ?? "—"}</p>
                        <p className="text-xs text-zinc-600">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-500">{u.username ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-400">{u.country ?? "—"}</td>
                      <td className="px-4 py-3">
                        {u.is_admin && <span className="rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-medium text-[#D4AF37]">ADMIN</span>}
                        {!u.is_admin && <span className="text-xs text-zinc-600">User</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${u.is_suspended ? "bg-red-400/10 text-red-400" : "bg-emerald-400/10 text-emerald-400"}`}>
                          {u.is_suspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{u.currentChallengeLabel}</td>
                      <td className="px-4 py-3 text-right text-zinc-400">{u.totalPurchases}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-300">₦{u.lifetimeSpend.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{timeAgo(u.lastActivity)}</td>
                      <td className="px-2 py-3">
                        <ActionsMenu
                          user={u}
                          isAwaitingProvisioning={awaitingProvisioningIds.has(u.id)}
                          onSuspendToggle={handleSuspendToggle}
                          onRetryProvisioning={() => fetchUsers(search, filter, page)}
                        />
                      </td>
                    </tr>
                    {expandedId === u.id && (
                      <tr key={`${u.id}-detail`}>
                        <td colSpan={11} className="p-0">
                          <UserDetailPanel userId={u.id} onProvisioned={() => fetchUsers(search, filter, page)} />
                        </td>
                      </tr>
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
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-400 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-400 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
