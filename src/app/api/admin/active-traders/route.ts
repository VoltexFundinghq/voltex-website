import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getActiveTradersPage } from "@/lib/database/admin-active-traders";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");

  const filters = {
    accountSize: searchParams.get("accountSize") ?? undefined,
    phase: searchParams.get("phase") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    profitability: searchParams.get("profitability") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    vpsSlot: searchParams.get("vpsSlot") ?? undefined,
    riskLevel: searchParams.get("riskLevel") ?? undefined,
  };

  const result = await getActiveTradersPage({ search, filters, page, pageSize: 50 });
  return NextResponse.json(result);
}
