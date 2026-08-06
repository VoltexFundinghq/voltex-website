import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getAdminDetail, logAdminAuditEvent } from "@/lib/database/admin-admins";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await getAdminDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (id === admin.id) return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });

  const serviceClient = createServiceClient();

  // Real, permanent fix — clear every real reference an ADMIN account
  // could plausibly leave behind, BEFORE attempting the actual auth
  // deletion. Historical rows are preserved (audit trail, review
  // cases, ticket messages) — only the now-deleted person's ID is
  // detached from them, matching the same pattern used in the
  // pre-launch reset script.
  await (serviceClient.from("audit_events") as any).update({ user_id: null }).eq("user_id", id);
  await (serviceClient.from("manual_reviews") as any).update({ assigned_admin_id: null }).eq("assigned_admin_id", id);
  await (serviceClient.from("manual_review_events") as any).update({ admin_id: null }).eq("admin_id", id);
  await (serviceClient.from("manual_review_notes") as any).update({ admin_id: null }).eq("admin_id", id);
  await (serviceClient.from("support_ticket_messages") as any).update({ sender_id: null }).eq("sender_id", id);

  try {
    const { error } = await serviceClient.auth.admin.deleteUser(id);
    if (error) {
      console.error("deleteUser returned an error object:", error);
      return NextResponse.json({ error: error.message, details: JSON.stringify(error) }, { status: 500 });
    }
  } catch (thrownErr: any) {
    console.error("deleteUser THREW an exception:", thrownErr);
    return NextResponse.json({ error: thrownErr?.message ?? "Unknown thrown error", details: JSON.stringify(thrownErr, Object.getOwnPropertyNames(thrownErr)) }, { status: 500 });
  }

  await (serviceClient.from("users") as any).delete().eq("id", id);

  try {
    await logAdminAuditEvent(serviceClient, admin.id, "Deleted Admin", `Deleted admin ${id} by ${admin.email}`);
  } catch (logErr) {
    console.error("Failed to log Deleted Admin audit event (non-fatal):", logErr);
  }

  return NextResponse.json({ success: true });
}
