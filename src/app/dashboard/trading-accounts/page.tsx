"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CustomerHeader from "@/components/customer/CustomerHeader";
import { Copy, CheckCircle2 } from "lucide-react";

interface TradingAccountCard {
  id: string;
  mt5Login: string | null;
  server: string | null;
  challengeSize: number | null;
  phase: number;
  status: string;
  balance: number | null;
  equity: number | null;
  lastSync: string | null;
  isRetired: boolean;
  retiredReason: string | null;
}

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never synced";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default function TradingAccountsPage() {
  const [accounts, setAccounts] = useState<TradingAccountCard[] | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch(`/api/dashboard/trading-accounts?userId=${user.id}`);
      const data = await res.json();
      setAccounts(data.accounts ?? []);
    }
    load();
  }, []);

  async function copyLogin(id: string, login: string) {
    await navigator.clipboard.writeText(login);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div>
      <CustomerHeader title="Trading Accounts" />
      <div className="p-4 sm:p-8">
        {accounts === null ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : accounts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-zinc-400">No trading accounts assigned yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((a) => (
              <div key={a.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-sm text-zinc-200">{a.mt5Login}</p>
                  {a.isRetired ? (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-400">Retired — {a.retiredReason}</span>
                  ) : (
                    <span className="rounded-full bg-[#D4AF37]/10 px-2 py-0.5 text-[11px] font-medium text-[#D4AF37]">{a.status}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">{a.server} · {fmtMoney(a.challengeSize)}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-zinc-500">Balance</p><p className="mt-0.5 text-zinc-200">{fmtMoney(a.balance)}</p></div>
                  <div><p className="text-xs text-zinc-500">Equity</p><p className="mt-0.5 text-zinc-200">{fmtMoney(a.equity)}</p></div>
                </div>
                <p className="mt-3 text-xs text-zinc-600">Last sync: {timeAgo(a.lastSync)}</p>
                <button onClick={() => copyLogin(a.id, a.mt5Login ?? "")} className="mt-4 flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
                  {copiedId === a.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy Login
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
