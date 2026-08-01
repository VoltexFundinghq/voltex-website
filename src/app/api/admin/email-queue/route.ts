import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getEmailEventsPage } from "@/lib/database/admin-email-queue";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");

  const data = await getEmailEventsPage({ search, category, page, pageSize: 25 });
  return NextResponse.json(data);
}
