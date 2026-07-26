"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface FailureAnalytics {
  bySize: { size: string; count: number }[];
  byReason: { reason: string; count: number }[];
  byPhase: { phase: string; count: number }[];
  byDay: { date: string; count: number }[];
}

export default function FailureCharts({ data }: { data: FailureAnalytics }) {
  const hasReasonData = data.byReason.some((d) => d.count > 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-lg font-semibold text-white">Failures by Reason</h2>
      {hasReasonData ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.byReason} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
            <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="reason" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} width={160} />
            <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[200px] items-center justify-center text-sm text-zinc-600">No failed challenges yet.</div>
      )}
    </div>
  );
}
