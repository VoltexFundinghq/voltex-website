import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { syncManualReviews, getReviewsPage } from "@/lib/database/admin-manual-reviews";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await syncManualReviews();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const filter = searchParams.get("filter") ?? "all";
  const priority = searchParams.get("priority") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");

  const result = await getReviewsPage({ search, filter, priority, category, page, pageSize: 20 });
  return NextResponse.json(result);
}
