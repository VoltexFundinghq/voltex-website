"use client";

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface FundedChartData {
  bySize: { size: string; count: number }[];
  profitDistribution: { bucket: string; count: number }[];
  profitVsDrawdown: { name: string; value: number }[];
  monthlyPayouts: { month: string; total: number }[];
  payoutHistory30Days: { date: string; total: number }[];
}

const PIE_COLORS = ["#22c55e", "#ef4444", "#D4AF37"];

function EmptyChart() {
  return <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">No data yet.</div>;
}

export default function FundedTraderCharts({ data }: { data: FundedChartData }) {
  const hasSizeData = data.bySize.some((d) => d.count > 0);
  const hasProfitDist = data.profitDistribution.some((d) => d.count > 0);
  const hasProfitVsDD = data.profitVsDrawdown.some((d) => d.value > 0);
  const hasMonthlyPayouts = data.monthlyPayouts.some((d) => d.total > 0);
  const hasPayoutHistory = data.payoutHistory30Days.some((d) => d.total > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Funded Accounts by Size</h3>
        {hasSizeData ? (
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

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Profit Distribution</h3>
        {hasProfitDist ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.profitDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="bucket" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Profit vs Drawdown</h3>
        {hasProfitVsDD ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data.profitVsDrawdown} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>
                {data.profitVsDrawdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-white">Payout History — Last 30 Days</h3>
        {hasPayoutHistory ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.payoutHistory30Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} interval={4} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} formatter={(v: any) => [`₦${Number(v).toLocaleString()}`, "Payouts"]} />
              <Line type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Monthly Payouts</h3>
        {hasMonthlyPayouts ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.monthlyPayouts}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} formatter={(v: any) => [`₦${Number(v).toLocaleString()}`, "Total"]} />
              <Bar dataKey="total" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
    </div>
  );
}
