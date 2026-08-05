"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronRight, Plus, X, Key, LogOut, Ban, CheckCircle2, Trash2, CheckCircle } from "lucide-react";

interface AdminRow {
  id: string;
  fullName: string | null;
  email: string;
  role: string | null;
  isSuspended: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  isPendingInvite: boolean;
}

interface AdminDetail {
  profile: { fullName: string | null; email: string; phone: string | null; role: string | null; createdAt: string; lastSignInAt: string | null; isSuspended: boolean };
  permissions: { module: string; level: string }[];
  recentActivity: { eventName: string; timestamp: string; description: string | null }[];
  loginNote: string;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "super_admin", label: "Super Admin" },
  { value: "operations", label: "Operations" },
  { value: "risk", label: "Risk" },
  { value: "finance", label: "Finance" },
  { value: "support", label: "Support" },
  { value: "suspended", label: "Suspended" },
];

const ROLE_LABELS: Record<string, string> = { super_admin: "Super Admin", operations: "Operations", risk_manager: "Risk Manager", finance: "Finance", support: "Support" };
const ROLE_OPTIONS = ["super_admin", "operations", "risk_manager", "finance", "support"];
const PERMISSION_LEVELS = ["no_access", "read", "write", "full"];

function fmtDate(dateStr: string): string { return new Date(dateStr).toLocaleDateString(); }
function fmtDateTime(dateStr: string | null): string { return dateStr ? new Date(dateStr).toLocaleString() : "Never signed in"; }

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("support");
  const [saving, setSaving] = useState(false);

  async function handleInvite() {
    if (!fullName.trim() || !email.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/admins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, email, role }) });
      const data = await res.json();
      if (res.ok) { onInvited(); onClose(); } else { alert(data.error ?? "Failed to invite."); }
    } catch { alert("Failed to invite."); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0a0a0a] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">Invite Admin</h3><button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs text-zinc-500">Full Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs text-zinc-500">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" /></div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none">
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleInvite} disabled={saving || !fullName.trim() || !email.trim()} className="mt-4 w-full rounded-lg bg-[#D4AF37] py-2 text-sm font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50">
          {saving ? "Sending..." : "Send Invitation"}
        </button>
      </div>
    </div>
  );
}

function DetailPanel({ adminId, currentAdminId, onUpdated }: { adminId: string; currentAdminId: string; onUpdated: () => void }) {
  const [detail, setDetail] = useState<AdminDetail | null>(null);
  const [busy, setBusy] = useState(false);

  function load() { fetch(`/api/admin/admins/${adminId}`).then((r) => r.json()).then(setDetail); }
  useEffect(() => { load(); }, [adminId]);

  async function handleRoleChange(role: string) {
    setBusy(true);
    try { await fetch(`/api/admin/admins/${adminId}/role`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) }); load(); onUpdated(); } catch { alert("Failed."); }
    setBusy(false);
  }
  async function handlePermissionChange(module: string, level: string) {
    setBusy(true);
    try { await fetch(`/api/admin/admins/${adminId}/permissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module, level }) }); load(); } catch { alert("Failed."); }
    setBusy(false);
  }
  async function handleResetPassword() {
    setBusy(true);
    try { const r = await fetch(`/api/admin/admins/${adminId}/reset-password`, { method: "POST" }); const d = await r.json(); alert(r.ok ? "Password reset email sent." : d.error); } catch { alert("Failed."); }
    setBusy(false);
  }
  async function handleForceLogout() {
    setBusy(true);
    try { const r = await fetch(`/api/admin/admins/${adminId}/force-logout`, { method: "POST" }); const d = await r.json(); alert(r.ok ? "Sessions cleared." : d.error); } catch { alert("Failed."); }
    setBusy(false);
  }
  async function handleSuspendToggle(suspend: boolean) {
    if (adminId === currentAdminId) { alert("You cannot suspend your own account."); return; }
    setBusy(true);
    try { await fetch(`/api/admin/admins/${adminId}/suspend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suspend }) }); load(); onUpdated(); } catch { alert("Failed."); }
    setBusy(false);
  }
  async function handleDelete() {
    if (adminId === currentAdminId) { alert("You cannot delete your own account."); return; }
    if (!confirm("Permanently delete this admin? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/admins/${adminId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) onUpdated(); else alert(data.error ?? "Failed to delete.");
    } catch { alert("Failed."); }
    setBusy(false);
  }

  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;

  return (
    <div className="bg-black/30 p-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Profile</h4>
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.profile.fullName ?? "—"}</span></p>
              <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.profile.email}</span></p>
              <p className="text-zinc-400">Phone: <span className="text-zinc-200">{detail.profile.phone ?? "—"}</span></p>
              <p className="text-zinc-400">Created: <span className="text-zinc-200">{fmtDate(detail.profile.createdAt)}</span></p>
              <p className="text-zinc-400">Last Login: <span className="text-zinc-200">{fmtDateTime(detail.profile.lastSignInAt)}</span></p>
            </div>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Role</h4>
            <select value={detail.profile.role ?? ""} onChange={(e) => handleRoleChange(e.target.value)} disabled={busy} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none">
              <option value="">Unassigned</option>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Actions</h4>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={handleResetPassword} disabled={busy} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"><Key className="h-3 w-3" /> Reset Password</button>
              <button onClick={handleForceLogout} disabled={busy} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"><LogOut className="h-3 w-3" /> Force Logout</button>
              {detail.profile.isSuspended ? (
                <button onClick={() => handleSuspendToggle(false)} disabled={busy} className="flex items-center gap-1 rounded-lg border border-emerald-400/20 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-400/10"><CheckCircle2 className="h-3 w-3" /> Activate</button>
              ) : (
                <button onClick={() => handleSuspendToggle(true)} disabled={busy} className="flex items-center gap-1 rounded-lg border border-amber-400/20 px-2.5 py-1 text-xs text-amber-400 hover:bg-amber-400/10"><Ban className="h-3 w-3" /> Suspend</button>
              )}
              <button onClick={handleDelete} disabled={busy} className="flex items-center gap-1 rounded-lg border border-red-400/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-400/10"><Trash2 className="h-3 w-3" /> Delete Admin</button>
            </div>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Permissions</h4>
          <p className="mb-2 text-[11px] text-emerald-400">Genuinely enforced — every admin API request is checked against these settings. "No access" truly blocks the action.</p>
          <div className="space-y-1.5">
            {detail.permissions.map((p) => (
              <div key={p.module} className="flex items-center justify-between rounded-lg border border-white/10 px-2.5 py-1.5 text-xs">
                <span className="text-zinc-300">{p.module}</span>
                <select value={p.level} onChange={(e) => handlePermissionChange(p.module, e.target.value)} disabled={busy} className="rounded border border-white/10 bg-black/50 px-2 py-0.5 text-[11px] text-zinc-300 focus:outline-none">
                  {PERMISSION_LEVELS.map((l) => <option key={l} value={l}>{l.replace("_", " ")}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Recent Activity</h4>
          {detail.recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-600">No recorded actions yet.</p>
          ) : (
            <div className="space-y-2">
              {detail.recentActivity.map((a, i) => (
                <div key={i} className="border-b border-white/5 pb-1.5 text-xs last:border-0">
                  <p className="text-zinc-300">{a.eventName}</p>
                  <p className="text-zinc-600">{fmtDateTime(a.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-zinc-600">{detail.loginNote}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminsTable({ initialAdmins }: { initialAdmins: AdminRow[] }) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string>("");

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => setCurrentAdminId(data.user?.id ?? ""));
    });
  }, []);

  const fetchAdmins = useCallback((searchVal: string, filterVal: string) => {
    const params = new URLSearchParams({ filter: filterVal });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/admins?${params}`).then((r) => r.json()).then((data) => setAdmins(data.admins));
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchAdmins(search, filter), search ? 350 : 0); return () => clearTimeout(t); }, [search, filter, fetchAdmins]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email..." className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === f.value ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>{f.label}</button>
          ))}
          <button onClick={() => setShowInvite(true)} className="ml-2 flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#F5D573]"><Plus className="h-3.5 w-3.5" /> Invite Admin</button>
        </div>
      </div>

      {admins.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">Only one administrator currently has access to the system.</p>
          <p className="mt-1 text-xs text-zinc-600">Invite another administrator to begin delegating operations.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last Login</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <>
                    <tr key={a.id} onClick={() => setExpandedId(expandedId === a.id ? null : a.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-3 text-zinc-600">{expandedId === a.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                      <td className="px-4 py-3 text-zinc-300">{a.fullName ?? "—"}{a.id === currentAdminId && <span className="ml-2 text-[10px] text-zinc-600">(you)</span>}</td>
                      <td className="px-4 py-3 text-zinc-400">{a.email}</td>
                      <td className="px-4 py-3 text-zinc-400">{a.role ? ROLE_LABELS[a.role] : "Unassigned"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${a.isSuspended ? "bg-red-400/10 text-red-400" : "bg-emerald-400/10 text-emerald-400"}`}>{a.isSuspended ? "Suspended" : "Active"}</span>
                        {a.isPendingInvite && <span className="ml-1.5 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-400">Pending</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(a.lastSignInAt)}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDate(a.createdAt)}</td>
                    </tr>
                    {expandedId === a.id && (
                      <tr key={`${a.id}-detail`}><td colSpan={7} className="p-0"><DetailPanel adminId={a.id} currentAdminId={currentAdminId} onUpdated={() => fetchAdmins(search, filter)} /></td></tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={() => fetchAdmins(search, filter)} />}
    </div>
  );
}
