"use client";

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface InventoryChartsProps {
  byStage: { stage: string; count: number }[];
  bySize: { size: string; count: number }[];
  availableCapacity: { size: string; available: number }[];
}

const STAGE_COLORS: Record<string, string> = {
  Available: "#22c55e", "Phase 1": "#3b82f6", "Phase 2": "#3b82f6",
  Funded: "#D4AF37", Retired: "#71717a", Deleted: "#ef4444", Reserved: "#f59e0b",
};

function EmptyChart() {
  return <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">No data yet.</div>;
}

export default function InventoryCharts({ data }: { data: InventoryChartsProps }) {
  const hasStage = data.byStage.some((d) => d.count > 0);
  const hasSize = data.bySize.some((d) => d.count > 0);
  const hasCapacity = data.availableCapacity.some((d) => d.available > 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Lifecycle Analytics</h2>
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">By Stage</h3>
          {hasStage ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.byStage} dataKey="count" nameKey="stage" innerRadius={40} outerRadius={70}>
                  {data.byStage.map((d, i) => <Cell key={i} fill={STAGE_COLORS[d.stage] ?? "#71717a"} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">By Account Size</h3>
          {hasSize ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.bySize}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="size" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
                <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-white">Available Capacity</h3>
          {hasCapacity ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.availableCapacity}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="size" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
                <Bar dataKey="available" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>
    </div>
  );
}
