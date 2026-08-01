import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { syncAuditEvents, getAuditEventsPage } from "@/lib/database/admin-audit-logs";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncAuditEvents();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const result = searchParams.get("result") ?? undefined;
  const dateRange = searchParams.get("dateRange") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");

  const data = await getAuditEventsPage({ search, category, result, dateRange, page, pageSize: 25 });
  return NextResponse.json(data);
}
