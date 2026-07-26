"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, ChevronDown, ChevronRight, MoreVertical, Ban, CheckCircle2, Mail, Key,
  FileText, Eye, Wallet, RotateCw, Circle, AlertTriangle,
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

interface TimelineStep {
  label: string;
  timestamp: string | null;
  reached: boolean;
}

interface Journey {
  id: string;
  label: string;
  timeline: TimelineStep[];
  assignedAccounts: {
    account_login: string | null; server: string | null; currentStage: string;
    challenge_size: string | null; assigned_at: string | null; status: string;
    password_last_reset_at: string | null; last_sync: string | null;
  }[];
}

interface Alert {
  label: string;
  active: boolean;
  detail: string;
}

interface ActivityEvent {
  text: string;
  timestamp: string;
}

interface UserDetail {
  profile: {
    id: string; full_name: string | null; email: string; username: string | null;
    country: string | null; phone: string | null; created_at: string; last_sign_in_at: string | null;
  };
  journeys: Journey[];
  alerts: Alert[];
  activityFeed: ActivityEvent[];
  financialSummary: {
    totalChallengePurchases: number; totalRevenue: number; refunds: number;
    payoutsPaid: number; outstandingPayout: number; netRevenue: number;
  };
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

const TABS = ["Profile", "Journeys", "Financial", "Activity"] as const;
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
function activityGroupLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString();
}

function statusBadge(status: string): string {
  const s = status.toLowerCase();
  if (["active", "passed", "funded", "available"].includes(s)) return "bg-emerald-400/10 text-emerald-400";
  if (["assigned"].includes(s)) return "bg-blue-400/10 text-blue-400";
  if (["awaiting_allocation", "pending", "resetting"].includes(s)) return "bg-amber-400/10 text-amber-400";
  if (["failed", "suspended"].includes(s) || s.includes("retired")) return "bg-red-400/10 text-red-400";
  return "bg-white/5 text-zinc-400";
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
    { label: "View Assigned Accounts", icon: Wallet, action: () => setOpen(false), live: true },
    ...(isAwaitingProvisioning ? [{ label: "Provision Account", icon: RotateCw, action: () => { onRetryProvisioning(user.id); setOpen(false); }, live: true }] : []),
    user.is_suspended
      ? { label: "Activate User", icon: CheckCircle2, action: () => { onSuspendToggle(user.id, false); setOpen(false); }, live: true }
      : { label: "Suspend User", icon: Ban, action: () => { onSuspendToggle(user.id, true); setOpen(false); }, live: true },
    { label: "Reset Password", icon: Key, action: () => setOpen(false), live: false },
    { label: "Send Email", icon: Mail, action: () => setOpen(false), live: false },
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

function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  const activeAlerts = alerts.filter((a) => a.active);
  return (
    <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="flex flex-wrap gap-2">
        {alerts.map((a) => (
          <span
            key={a.label}
            title={a.detail}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              a.active ? "bg-red-400/10 text-red-400" : "bg-white/5 text-zinc-600"
            }`}
          >
            <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
            {a.label}
          </span>
        ))}
      </div>
      {activeAlerts.length === 0 && <p className="mt-1.5 text-xs text-zinc-600">No active alerts.</p>}
    </div>
  );
}

function UserDetailPanel({ userId, onProvisioned }: { userId: string; onProvisioned: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Profile");
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionMsg, setProvisionMsg] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setActiveJourneyId(data.journeys?.[0]?.id ?? null);
        setLoading(false);
      })
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

  const activeJourney = detail.journeys.find((j) => j.id === activeJourneyId) ?? detail.journeys[0];

  let lastGroupLabel = "";

  return (
    <div className="bg-black/30 p-6">
      <AlertsPanel alerts={detail.alerts} />

      <div className="flex flex-wrap gap-1 border-b border-white/10">
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

      <div className="pt-6">
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

        {activeTab === "Journeys" && (
          detail.journeys.length === 0 ? (
            <p className="text-sm text-zinc-600">No challenges yet.</p>
          ) : (
            <div>
              {detail.journeys.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {detail.journeys.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setActiveJourneyId(j.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                        activeJourneyId === j.id ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                      }`}
                    >
                      {j.label}
                    </button>
                  ))}
                </div>
              )}
              {activeJourney && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timeline</h4>
                    <div>
                      {activeJourney.timeline.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                              {step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
                            </div>
                            {i < activeJourney.timeline.length - 1 && (
                              <div className={`w-px flex-1 ${step.reached ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "22px" }} />
                            )}
                          </div>
                          <div className="pb-5">
                            <p className={`text-sm ${step.reached ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
                            <p className="text-xs text-zinc-600">{step.timestamp ? fmtDateTime(step.timestamp) : "Not yet reached"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Assigned Accounts</h4>
                    <div className="space-y-2">
                      {activeJourney.assignedAccounts.map((a, i) => (
                        <div key={i} className="rounded-lg border border-white/10 p-3 text-xs">
                          <div className="flex items-center justify-between">
                            <p className="font-mono text-sm text-zinc-200">{a.account_login ?? "—"}</p>
                            <span className={`rounded-full px-2 py-0.5 font-medium ${statusBadge(a.currentStage)}`}>{a.currentStage}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-1 text-zinc-500">
                            <span>Server: <span className="text-zinc-300">{a.server ?? "—"}</span></span>
                            <span>Challenge: <span className="text-zinc-300">{a.challenge_size ?? "—"}</span></span>
                            <span>Assigned: <span className="text-zinc-300">{fmtDate(a.assigned_at)}</span></span>
                            <span>Status: <span className="text-zinc-300">{a.status}</span></span>
                            <span>Password Reset: <span className="text-zinc-300">{fmtDate(a.password_last_reset_at)}</span></span>
                            <span>Last Sync: <span className="text-zinc-300">{timeAgo(a.last_sync)}</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === "Financial" && (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <p className="text-zinc-400">Total Challenge Purchases: <span className="text-zinc-200">{detail.financialSummary.totalChallengePurchases}</span></p>
            <p className="text-zinc-400">Total Revenue: <span className="text-zinc-200">₦{detail.financialSummary.totalRevenue.toLocaleString()}</span></p>
            <p className="text-zinc-400">Refunds: <span className="text-zinc-200">₦{detail.financialSummary.refunds.toLocaleString()}</span></p>
            <p className="text-zinc-400">Payouts Paid: <span className="text-zinc-200">₦{detail.financialSummary.payoutsPaid.toLocaleString()}</span></p>
            <p className="text-zinc-400">Outstanding Payout: <span className="text-zinc-200">₦{detail.financialSummary.outstandingPayout.toLocaleString()}</span></p>
            <p className="text-[#D4AF37]">Net Revenue: <span className="font-semibold">₦{detail.financialSummary.netRevenue.toLocaleString()}</span></p>
          </div>
        )}

        {activeTab === "Activity" && (
          detail.activityFeed.length === 0 ? (
            <p className="text-sm text-zinc-600">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {detail.activityFeed.map((event, i) => {
                const groupLabel = activityGroupLabel(event.timestamp);
                const showGroupLabel = groupLabel !== lastGroupLabel;
                lastGroupLabel = groupLabel;
                return (
                  <div key={i}>
                    {showGroupLabel && <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-600 first:mt-0">{groupLabel}</p>}
                    <div className="flex items-baseline gap-3">
                      <span className="w-12 flex-shrink-0 font-mono text-xs text-zinc-600">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-sm text-zinc-300">{event.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
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
