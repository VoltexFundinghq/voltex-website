"use client";

import { useState } from "react";
import { X, Copy, CheckCircle2 } from "lucide-react";

interface CreatedAccount {
  login: string;
  password: string;
  investorPassword: string;
  server: string;
  accountSize: number;
}

function parseInput(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      const [login, sizeStr, server] = parts;
      return { login, accountSize: Number(sizeStr), server };
    });
}

export default function BulkAddInventoryModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<CreatedAccount[] | null>(null);
  const [errors, setErrors] = useState<{ login: string; reason: string }[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleSubmit() {
    const accounts = parseInput(input);
    if (accounts.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/inventory/bulk-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts }),
      });
      const data = await res.json();
      setResults(data.created ?? []);
      setErrors(data.errors ?? []);
      if (data.created?.length > 0) onAdded();
    } catch {
      alert("Failed to add accounts.");
    }
    setSubmitting(false);
  }

  async function copyRow(i: number, account: CreatedAccount) {
    const text = `Login: ${account.login}\nPassword: ${account.password}\nInvestor Password: ${account.investorPassword}\nServer: ${account.server}`;
    await navigator.clipboard.writeText(text);
    setCopiedIndex(i);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  async function copyAll() {
    if (!results) return;
    const text = results.map((a) => `Login: ${a.login}\nPassword: ${a.password}\nInvestor Password: ${a.investorPassword}\nServer: ${a.server}\n`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedIndex(-1);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a0a] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Add Inventory Accounts</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {!results ? (
          <>
            <p className="mb-3 text-xs text-zinc-500">One account per line: <span className="font-mono text-zinc-400">login,accountSize,server</span></p>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={"436994300,500000,Exness-MT5Trial9\n436994301,300000,Exness-MT5Trial9"}
              rows={8}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] p-3 font-mono text-sm text-zinc-300 placeholder:text-zinc-700 focus:border-[#D4AF37]/40 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || parseInput(input).length === 0}
              className="mt-4 w-full rounded-lg bg-[#D4AF37] py-2.5 text-sm font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50"
            >
              {submitting ? "Adding..." : `Add ${parseInput(input).length || ""} Account${parseInput(input).length === 1 ? "" : "s"}`}
            </button>
          </>
        ) : (
          <>
            {errors.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/5 p-3">
                <p className="text-xs font-medium text-red-400">{errors.length} row(s) failed:</p>
                {errors.map((e, i) => (
                  <p key={i} className="mt-1 text-xs text-zinc-400">{e.login}: {e.reason}</p>
                ))}
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-emerald-400">{results.length} account{results.length === 1 ? "" : "s"} created — copy these to Exness now.</p>
                  <button onClick={copyAll} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
                    {copiedIndex === -1 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy All
                  </button>
                </div>
                <div className="space-y-2">
                  {results.map((a, i) => (
                    <div key={i} className="rounded-lg border border-white/10 p-3 text-xs">
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="font-mono text-sm text-zinc-200">{a.login} · ₦{a.accountSize.toLocaleString()}</p>
                        <button onClick={() => copyRow(i, a)} className="flex items-center gap-1 text-zinc-500 hover:text-white">
                          {copiedIndex === i ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <p className="text-zinc-500">Password: <span className="font-mono text-zinc-300">{a.password}</span></p>
                      <p className="text-zinc-500">Investor: <span className="font-mono text-zinc-300">{a.investorPassword}</span></p>
                      <p className="text-zinc-500">Server: <span className="text-zinc-300">{a.server}</span></p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button onClick={onClose} className="mt-4 w-full rounded-lg border border-white/10 py-2 text-sm text-zinc-400 hover:bg-white/5">Done</button>
          </>
        )}
      </div>
    </div>
  );
}
