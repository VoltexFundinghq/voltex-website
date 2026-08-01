import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const { error } = await (serviceClient.from("manual_reviews") as any)
    .update({ assigned_admin_id: admin.id, status: "assigned", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to assign" }, { status: 500 });

  await (serviceClient.from("manual_review_events") as any).insert({ review_id: id, event_type: "Assigned", admin_id: admin.id, note: "Self-assigned" });

  return NextResponse.json({ success: true });
}
