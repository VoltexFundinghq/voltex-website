"use client";

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ChartData {
  byChallengeSize: { size: string; count: number }[];
  profitVsDrawdown: { name: string; value: number }[];
  phaseDistribution: { phase: string; count: number }[];
  avgProfitTargetProgress: number;
}

const PIE_COLORS = ["#22c55e", "#ef4444", "#71717a"];

export default function ActiveTraderCharts({ data }: { data: ChartData }) {
  const hasSizeData = data.byChallengeSize.some((d) => d.count > 0);
  const hasPhaseData = data.phaseDistribution.some((d) => d.count > 0);
  const hasProfitData = data.profitVsDrawdown.some((d) => d.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-white">Active Traders by Challenge Size</h3>
        {hasSizeData ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.byChallengeSize}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="size" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} labelStyle={{ color: "#D4AF37" }} />
              <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">No active traders yet.</div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Profit vs Drawdown</h3>
        {hasProfitData ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.profitVsDrawdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                {data.profitVsDrawdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">No data yet.</div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Phase Distribution</h3>
        {hasPhaseData ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.phaseDistribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="phase" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} width={60} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#D4AF37" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">No data yet.</div>
        )}
      </div>
    </div>
  );
}
