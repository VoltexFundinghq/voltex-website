import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { priority } = body;
  if (!["low", "medium", "high", "critical"].includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("manual_reviews") as any).update({ priority, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  await (serviceClient.from("manual_review_events") as any).insert({ review_id: id, event_type: "Priority Changed", admin_id: admin.id, note: `Changed to ${priority}` });

  return NextResponse.json({ success: true });
}
