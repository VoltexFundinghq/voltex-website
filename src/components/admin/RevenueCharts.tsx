"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface ChartsData {
  overTime: { date: string; revenue: number }[];
  byChallengeSize: { size: string; revenue: number }[];
  byGateway: { gateway: string; revenue: number }[];
  byCountry: { country: string; revenue: number }[];
}

function EmptyChart() { return <div className="flex h-[180px] items-center justify-center text-sm text-zinc-600">No data yet.</div>; }

export default function RevenueCharts({ data }: { data: ChartsData }) {
  const hasOverTime = data.overTime.some((d) => d.revenue > 0);
  const hasSize = data.byChallengeSize.length > 0;
  const hasCountry = data.byCountry.length > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 md:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-white">Revenue Over Time — Last 30 Days</h3>
        {hasOverTime ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.overTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} interval={4} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} formatter={(v: any) => [`₦${Number(v).toLocaleString()}`, "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Revenue By Challenge Size</h3>
        {hasSize ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.byChallengeSize}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="size" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Bar dataKey="revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Revenue By Country</h3>
        {hasCountry ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.byCountry} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="country" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }} />
              <Bar dataKey="revenue" fill="#D4AF37" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart />}
      </div>
    </div>
  );
}
