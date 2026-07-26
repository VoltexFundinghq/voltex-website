import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getFundedTradersPage } from "@/lib/database/admin-funded-traders";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");

  const filters = {
    accountSize: searchParams.get("accountSize") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    vpsSlot: searchParams.get("vpsSlot") ?? undefined,
    riskLevel: searchParams.get("riskLevel") ?? undefined,
    payoutStatus: searchParams.get("payoutStatus") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  };

  const result = await getFundedTradersPage({ search, filters, page, pageSize: 50 });
  return NextResponse.json(result);
}
