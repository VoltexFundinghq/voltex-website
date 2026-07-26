import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getPurchasesPage } from "@/lib/database/admin-purchases";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const filter = searchParams.get("filter") ?? "all";
  const page = Number(searchParams.get("page") ?? "1");

  const result = await getPurchasesPage({ search, filter, page, pageSize: 20 });
  return NextResponse.json(result);
}
