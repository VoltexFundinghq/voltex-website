"use client";

import { useState } from "react";

interface CustomerRank { name: string | null; email: string; totalSpent: number; purchaseCount: number }
interface LargePurchase { name: string | null; email: string; amount: number; challengeSize: string; date: string }
interface Leaderboards {
  highestPaying: CustomerRank[];
  mostPurchases: CustomerRank[];
  largestSinglePurchase: LargePurchase[];
  repeatCustomerCount: number;
}

const TABS = ["Highest Paying", "Most Purchases", "Largest Single Purchase"] as const;

export default function RevenueLeaderboardCard({ leaderboards }: { leaderboards: Leaderboards }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Highest Paying");

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
        <p className="text-xs text-zinc-500">Repeat Customers: <span className="text-[#D4AF37]">{leaderboards.repeatCustomerCount}</span></p>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab === t ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>{t}</button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {tab === "Highest Paying" && (
          leaderboards.highestPaying.length === 0 ? <p className="text-sm text-zinc-600">No data yet.</p> :
          leaderboards.highestPaying.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
              <span className="text-zinc-300">#{i + 1} {c.name ?? c.email}</span>
              <span className="font-mono text-[#D4AF37]">₦{c.totalSpent.toLocaleString()}</span>
            </div>
          ))
        )}
        {tab === "Most Purchases" && (
          leaderboards.mostPurchases.length === 0 ? <p className="text-sm text-zinc-600">No data yet.</p> :
          leaderboards.mostPurchases.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
              <span className="text-zinc-300">#{i + 1} {c.name ?? c.email}</span>
              <span className="text-zinc-400">{c.purchaseCount} purchases</span>
            </div>
          ))
        )}
        {tab === "Largest Single Purchase" && (
          leaderboards.largestSinglePurchase.length === 0 ? <p className="text-sm text-zinc-600">No data yet.</p> :
          leaderboards.largestSinglePurchase.map((c, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
              <span className="text-zinc-300">#{i + 1} {c.name ?? c.email} — {c.challengeSize}</span>
              <span className="font-mono text-[#D4AF37]">₦{c.amount.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
