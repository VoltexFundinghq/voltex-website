"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function RevenueChartCard() {
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [data, setData] = useState<{ label: string; revenue: number }[]>([]);

  useEffect(() => {
    fetch(`/api/admin/payments/revenue-chart?granularity=${granularity}`)
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []));
  }, [granularity]);

  const hasData = data.some((d) => d.revenue > 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Revenue — Last 30 Days</h2>
        <div className="flex gap-1">
          {(["daily", "weekly", "monthly"] as const).map((g) => (
            <button key={g} onClick={() => setGranularity(g)} className={`rounded-lg px-3 py-1 text-xs font-medium capitalize ${granularity === g ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
              {g}
            </button>
          ))}
        </div>
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} interval={granularity === "daily" ? 4 : 1} />
            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} formatter={(v: any) => [`₦${Number(v).toLocaleString()}`, "Revenue"]} />
            <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[220px] items-center justify-center text-sm text-zinc-600">No revenue data yet.</div>
      )}
    </div>
  );
}
