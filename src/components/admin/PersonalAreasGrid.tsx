"use client";

import { useState, useEffect } from "react";
import { X, Wallet, History, Ban, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";

interface PaCard {
  id: string;
  label: string;
  exnessEmail: string | null;
  status: string;
  totalAccounts: number;
  available: number;
  assigned: number;
  retired: number;
  lastAccountAdded: string | null;
  maxCapacity: number;
  capacityUsedPercent: number;
  isLowCapacity: boolean;
}

interface PaAccountRow {
  mt5Login: string;
  challengeSize: number;
  status: string;
  assignedTraderName: string | null;
  createdAt: string;
  assignedDate: string | null;
  retiredDate: string | null;
  lastSync: string | null;
  vpsStatus: string;
}

interface ProvisionHistoryEntry {
  time: string;
  traderName: string | null;
  challengeSize: number | null;
  accountLogin: string | null;
  success: boolean;
  reason: string | null;
}

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

function capacityColor(percent: number): string {
  if (percent > 90) return "bg-red-400";
  if (percent >= 70) return "bg-amber-400";
  return "bg-emerald-400";
}
function statusBadge(status: string): string {
  if (status === "connected") return "bg-emerald-400/10 text-emerald-400";
  if (status === "maintenance") return "bg-amber-400/10 text-amber-400";
  return "bg-red-400/10 text-red-400";
}

function AddPaModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("100");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/personal-areas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), exnessEmail: email, exnessPassword: password, maxCapacity: Number(maxCapacity), notes }),
      });
      const data = await res.json();
      if (res.ok) { onAdded(); onClose(); } else { alert(data.error ?? "Failed to save."); }
    } catch { alert("Failed to save."); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0a0a0a] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Add Personal Area</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">PA Name</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="2" className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Exness Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pa2@voltexfunding.com" className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Max Capacity</label>
            <input type="number" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || !label.trim()} className="mt-4 w-full rounded-lg bg-[#D4AF37] py-2 text-sm font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function AccountsPanel({ paId }: { paId: string }) {
  const [accounts, setAccounts] = useState<PaAccountRow[] | null>(null);
  useEffect(() => { fetch(`/api/admin/personal-areas/${paId}/accounts`).then((r) => r.json()).then((d) => setAccounts(d.accounts ?? [])); }, [paId]);

  if (accounts === null) return <p className="p-4 text-sm text-zinc-500">Loading...</p>;
  if (accounts.length === 0) return <p className="p-4 text-sm text-zinc-600">No accounts in this PA yet.</p>;

  return (
    <div className="max-h-80 overflow-y-auto p-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-white/10 text-left text-zinc-500">
            <th className="py-2 pr-3">MT5 Login</th><th className="py-2 pr-3">Size</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Trader</th><th className="py-2 pr-3">Created</th><th className="py-2 pr-3">VPS</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.mt5Login} className="border-b border-white/5">
              <td className="py-2 pr-3 font-mono text-zinc-300">{a.mt5Login}</td>
              <td className="py-2 pr-3 text-zinc-400">{fmtMoney(a.challengeSize)}</td>
              <td className="py-2 pr-3 text-zinc-400">{a.status}</td>
              <td className="py-2 pr-3 text-zinc-400">{a.assignedTraderName ?? "—"}</td>
              <td className="py-2 pr-3 text-zinc-500">{fmtDate(a.createdAt)}</td>
              <td className="py-2 pr-3 text-zinc-500">{a.vpsStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryPanel({ paId }: { paId: string }) {
  const [history, setHistory] = useState<ProvisionHistoryEntry[] | null>(null);
  useEffect(() => { fetch(`/api/admin/personal-areas/${paId}/history`).then((r) => r.json()).then((d) => setHistory(d.history ?? [])); }, [paId]);

  if (history === null) return <p className="p-4 text-sm text-zinc-500">Loading...</p>;
  if (history.length === 0) return <p className="p-4 text-sm text-zinc-600">No provisioning activity yet.</p>;

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto p-4">
      {history.map((h, i) => (
        <div key={i} className="rounded-lg border border-white/10 p-2 text-xs">
          <p className="text-zinc-300">{h.traderName ?? "—"} — {fmtMoney(h.challengeSize)} — <span className="font-mono">{h.accountLogin}</span></p>
          <p className="text-emerald-400">Provision Success · {fmtDateTime(h.time)}</p>
        </div>
      ))}
    </div>
  );
}

function PaCardComponent({ pa, onUpdated }: { pa: PaCard; onUpdated: () => void }) {
  const [view, setView] = useState<"none" | "accounts" | "history">("none");

  async function handleDisable() {
    const newStatus = pa.status === "connected" ? "disconnected" : "connected";
    try { await fetch(`/api/admin/personal-areas/${pa.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) }); onUpdated(); } catch { alert("Failed."); }
  }
  async function handleDelete() {
    if (!confirm(`Delete PA ${pa.label}? This only works if it has no accounts.`)) return;
    try {
      const res = await fetch(`/api/admin/personal-areas/${pa.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) onUpdated(); else alert(data.error ?? "Failed to delete.");
    } catch { alert("Failed."); }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">PA {pa.label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${statusBadge(pa.status)}`}>{pa.status}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{pa.exnessEmail ?? "No email on file"}</p>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div><p className="text-zinc-500">Available</p><p className="text-emerald-400">{pa.available}</p></div>
        <div><p className="text-zinc-500">Assigned</p><p className="text-zinc-200">{pa.assigned}</p></div>
        <div><p className="text-zinc-500">Retired</p><p className="text-zinc-200">{pa.retired}</p></div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Capacity</span><span>{pa.totalAccounts} / {pa.maxCapacity}</span></div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${capacityColor(pa.capacityUsedPercent)}`} style={{ width: `${Math.min(100, pa.capacityUsedPercent)}%` }} /></div>
      </div>

      <p className="mt-3 text-xs text-zinc-600">Last account added: {fmtDate(pa.lastAccountAdded)}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <button onClick={() => setView(view === "accounts" ? "none" : "accounts")} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"><Wallet className="h-3 w-3" /> View Accounts</button>
        <button onClick={() => setView(view === "history" ? "none" : "history")} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"><History className="h-3 w-3" /> History</button>
        <button onClick={handleDisable} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5"><Ban className="h-3 w-3" /> {pa.status === "connected" ? "Disable" : "Enable"}</button>
        <button onClick={handleDelete} className="flex items-center gap-1 rounded-lg border border-red-400/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-400/10"><Trash2 className="h-3 w-3" /> Delete</button>
      </div>

      {view === "accounts" && <div className="mt-3 rounded-lg border border-white/10 bg-black/30"><AccountsPanel paId={pa.id} /></div>}
      {view === "history" && <div className="mt-3 rounded-lg border border-white/10 bg-black/30"><HistoryPanel paId={pa.id} /></div>}
    </div>
  );
}

export default function PersonalAreasGrid({ initialCards }: { initialCards: PaCard[] }) {
  const [cards, setCards] = useState(initialCards);
  const [showAdd, setShowAdd] = useState(false);

  function refresh() {
    window.location.reload();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Personal Areas</h2>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#F5D573]">
          <Plus className="h-3.5 w-3.5" /> Add Personal Area
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">No Personal Areas configured yet.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((pa) => <PaCardComponent key={pa.id} pa={pa} onUpdated={refresh} />)}
        </div>
      )}

      {showAdd && <AddPaModal onClose={() => setShowAdd(false)} onAdded={refresh} />}
    </div>
  );
}
