import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getRevenueChart } from "@/lib/database/admin-payments";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const granularity = (searchParams.get("granularity") ?? "daily") as "daily" | "weekly" | "monthly";

  const data = await getRevenueChart(granularity);
  return NextResponse.json({ data });
}
