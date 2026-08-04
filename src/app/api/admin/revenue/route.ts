import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getRevenueSummary, getRevenueCharts, getRevenueLeaderboards, getRevenueForecast } from "@/lib/database/admin-revenue";

export async function GET() {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [summary, charts, leaderboards, forecast] = await Promise.all([
    getRevenueSummary(),
    getRevenueCharts(),
    getRevenueLeaderboards(),
    getRevenueForecast(),
  ]);

  return NextResponse.json({ summary, charts, leaderboards, forecast });
}
