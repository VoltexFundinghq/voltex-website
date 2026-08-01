import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status, resolutionNotes } = body;
  if (!["open", "assigned", "waiting_customer", "resolved", "rejected", "escalated"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const isFinal = status === "resolved" || status === "rejected";

  const { error } = await (serviceClient.from("manual_reviews") as any)
    .update({
      status,
      resolution_notes: resolutionNotes ?? null,
      updated_at: new Date().toISOString(),
      ...(isFinal ? { resolved_at: new Date().toISOString() } : {}),
    })
    .eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  const eventLabel = status === "resolved" ? "Resolved" : status === "rejected" ? "Rejected" : status === "escalated" ? "Escalated" : status === "waiting_customer" ? "Waiting Customer" : "Status Changed";
  await (serviceClient.from("manual_review_events") as any).insert({ review_id: id, event_type: eventLabel, admin_id: admin.id, note: resolutionNotes ?? null });

  return NextResponse.json({ success: true });
}
