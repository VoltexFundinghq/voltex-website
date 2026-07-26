"use client";

import { useState } from "react";
import { X, Copy, CheckCircle2, Plus } from "lucide-react";

interface StagingRow {
  tempId: string;
  password: string;
  investorPassword: string;
  login: string;
  server: string;
  accountSize: string;
  paLabel: string;
  saved: boolean;
}

const SIZE_OPTIONS = [200000, 300000, 500000, 700000, 800000];

export default function BulkAddInventoryModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function generateBatch() {
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/inventory/generate-passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10 }),
      });
      const data = await res.json();
      const newRows: StagingRow[] = data.rows.map((r: any, i: number) => ({
        tempId: `${Date.now()}-${i}`,
        password: r.password,
        investorPassword: r.investorPassword,
        login: "",
        server: "",
        accountSize: "",
        paLabel: "",
        saved: false,
      }));
      setRows((prev) => [...prev, ...newRows]);
    } catch {
      alert("Failed to generate passwords.");
    }
    setGenerating(false);
  }

  function updateRow(tempId: string, field: keyof StagingRow, value: string) {
    setRows((prev) => prev.map((r) => (r.tempId === tempId ? { ...r, [field]: value } : r)));
  }

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }

  async function saveRow(row: StagingRow) {
    if (!row.login || !row.server || !row.accountSize) return;
    setSavingId(row.tempId);
    try {
      const res = await fetch("/api/admin/inventory/save-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login: row.login,
          server: row.server,
          accountSize: Number(row.accountSize),
          paLabel: row.paLabel,
          password: row.password,
          investorPassword: row.investorPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.tempId === row.tempId ? { ...r, saved: true } : r)));
        onAdded();
      } else {
        alert(data.error ?? "Failed to save account.");
      }
    } catch {
      alert("Failed to save account.");
    }
    setSavingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a0a] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Add Inventory Accounts</h3>
            <p className="mt-1 text-xs text-zinc-500">Copy a password below, create the demo account on Exness with it, then fill in what Exness gives you back.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <button
          onClick={generateBatch}
          disabled={generating}
          className="mb-4 flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          {generating ? "Generating..." : "Generate 10 Passwords"}
        </button>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
            Click "Generate 10 Passwords" to start a batch.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-3 py-3 font-medium">Password</th>
                  <th className="px-3 py-3 font-medium">Investor Password</th>
                  <th className="px-3 py-3 font-medium">MT5 Login</th>
                  <th className="px-3 py-3 font-medium">Server</th>
                  <th className="px-3 py-3 font-medium">Size</th>
                  <th className="px-3 py-3 font-medium">PA</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.tempId} className={`border-b border-white/5 ${row.saved ? "bg-emerald-400/[0.03]" : ""}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-zinc-300">{row.password}</span>
                        <button onClick={() => copyValue(`${row.tempId}-pw`, row.password)} className="text-zinc-500 hover:text-white">
                          {copiedKey === `${row.tempId}-pw` ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-zinc-300">{row.investorPassword}</span>
                        <button onClick={() => copyValue(`${row.tempId}-inv`, row.investorPassword)} className="text-zinc-500 hover:text-white">
                          {copiedKey === `${row.tempId}-inv` ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.login}
                        onChange={(e) => updateRow(row.tempId, "login", e.target.value)}
                        disabled={row.saved}
                        placeholder="436994300"
                        className="w-28 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-700 focus:border-[#D4AF37]/40 focus:outline-none disabled:opacity-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.server}
                        onChange={(e) => updateRow(row.tempId, "server", e.target.value)}
                        disabled={row.saved}
                        placeholder="Exness-MT5Trial9"
                        className="w-36 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-700 focus:border-[#D4AF37]/40 focus:outline-none disabled:opacity-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.accountSize}
                        onChange={(e) => updateRow(row.tempId, "accountSize", e.target.value)}
                        disabled={row.saved}
                        className="rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none disabled:opacity-50"
                      >
                        <option value="">—</option>
                        {SIZE_OPTIONS.map((s) => <option key={s} value={s}>₦{s.toLocaleString()}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.paLabel}
                        onChange={(e) => updateRow(row.tempId, "paLabel", e.target.value)}
                        disabled={row.saved}
                        placeholder="1"
                        className="w-14 rounded border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-700 focus:border-[#D4AF37]/40 focus:outline-none disabled:opacity-50"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {row.saved ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Added</span>
                      ) : (
                        <button
                          onClick={() => saveRow(row)}
                          disabled={!row.login || !row.server || !row.accountSize || savingId === row.tempId}
                          className="rounded-lg bg-[#D4AF37] px-2.5 py-1 text-xs font-semibold text-black hover:bg-[#F5D573] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          {savingId === row.tempId ? "Saving..." : "Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-[11px] text-zinc-600">Rows not yet saved exist only in this window — closing before saving will lose them.</p>

        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm text-zinc-400 hover:bg-white/5">Close</button>
      </div>
    </div>
  );
}
