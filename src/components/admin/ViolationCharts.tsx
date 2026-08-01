"use client";

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ChartsData {
  last30Days: { date: string; count: number }[];
  ruleBreakdown: { rule: string; count: number }[];
  sizeVsFailures: { size: string; count: number }[];
}

const PIE_COLORS = ["#D4AF37", "#ef4444", "#3b82f6", "#f59e0b", "#71717a"];

function EmptyChart() {
  return <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">No data yet.</div>;
}

export default function ViolationCharts({ data }: { data: ChartsData }) {
  const has30Day = data.last30Days.some((d) => d.count > 0);
  const hasBreakdown = data.ruleBreakdown.some((d) => d.count > 0);
  const hasSize = data.sizeVsFailures.some((d) => d.count > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Violations — Last 30 Days</h3>
        {has30Day ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.last30Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} interval={4} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="count" stroke="#D4AF37" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Rule Breakdown</h3>
        {hasBreakdown ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.ruleBreakdown} dataKey="count" nameKey="rule" innerRadius={40} outerRadius={70}>
                {data.ruleBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Most Common Failure Reason</h3>
        {hasBreakdown ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.ruleBreakdown} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="rule" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#D4AF37" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Challenge Size vs Failure Count</h3>
        {hasSize ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.sizeVsFailures}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="size" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
    </div>
  );
}
