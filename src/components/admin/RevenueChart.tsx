"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface RevenuePoint {
  date: string;
  revenue: number;
}

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const hasAnyRevenue = data.some((d) => d.revenue > 0);

  if (!hasAnyRevenue) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-600">
        No completed payments in the last 30 days yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(212,175,55,0.2)", borderRadius: "8px" }}
          labelStyle={{ color: "#D4AF37" }}
          formatter={(value) => {
            const numeric = typeof value === "number" ? value : Number(value ?? 0);
            return [`₦${numeric.toLocaleString()}`, "Revenue"];
          }}
          labelFormatter={(d) => {
            const dateStr = typeof d === "string" || typeof d === "number" ? d : String(d ?? "");
            return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          }}
        />
        <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#D4AF37" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
