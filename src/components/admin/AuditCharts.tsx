"use client";

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

interface ChartsData {
  last30Days: { date: string; count: number }[];
  byCategory: { category: string; count: number }[];
  topEvents: { event: string; count: number }[];
  successVsFailed: { date: string; success: number; failed: number }[];
}

const PIE_COLORS = ["#D4AF37", "#3b82f6", "#ef4444", "#f59e0b", "#22c55e", "#71717a", "#8b5cf6", "#ec4899"];

function EmptyChart() {
  return <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">No data yet.</div>;
}

export default function AuditCharts({ data }: { data: ChartsData }) {
  const has30Day = data.last30Days.some((d) => d.count > 0);
  const hasCategory = data.byCategory.some((d) => d.count > 0);
  const hasTopEvents = data.topEvents.length > 0;
  const hasStacked = data.successVsFailed.some((d) => d.success > 0 || d.failed > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Events — Last 30 Days</h3>
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
        <h3 className="mb-3 text-sm font-semibold text-white">Events by Category</h3>
        {hasCategory ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.byCategory} dataKey="count" nameKey="category" innerRadius={40} outerRadius={70}>
                {data.byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Top System Events</h3>
        {hasTopEvents ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.topEvents} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="event" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} width={130} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#D4AF37" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Successful vs Failed</h3>
        {hasStacked ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.successVsFailed}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} interval={4} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="success" stackId="a" fill="#22c55e" name="Success" />
              <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
    </div>
  );
}
