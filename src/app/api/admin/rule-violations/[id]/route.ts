import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getViolationDetail } from "@/lib/database/admin-rule-violations";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await getViolationDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}
