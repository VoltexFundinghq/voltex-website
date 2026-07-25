import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const suspend = Boolean(body.suspend);

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("users") as any).update({ is_suspended: suspend }).eq("id", id);

  if (error) {
    console.error("Failed to update suspension status:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ success: true, is_suspended: suspend });
}
