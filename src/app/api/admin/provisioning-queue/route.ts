import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getQueue } from "@/lib/database/admin-provisioning-queue";

export async function GET() {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const queue = await getQueue();
  return NextResponse.json({ queue });
}
