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

  try {
    const { error } = await serviceClient.auth.admin.deleteUser(id);
    if (error) {
      console.error("deleteUser returned an error object:", error);
      return NextResponse.json({ error: error.message, details: JSON.stringify(error) }, { status: 500 });
    }
  } catch (thrownErr: any) {
    // This is the real, previously-hidden case — deleteUser() threw
    // outright rather than returning a normal {error} result.
    console.error("deleteUser THREW an exception:", thrownErr);
    return NextResponse.json({ error: thrownErr?.message ?? "Unknown thrown error", details: JSON.stringify(thrownErr, Object.getOwnPropertyNames(thrownErr)) }, { status: 500 });
  }

  try {
    await logAdminAuditEvent(serviceClient, id, "Deleted Admin", `Deleted by ${admin.email}`);
  } catch (logErr) {
    console.error("Failed to log Deleted Admin audit event (non-fatal):", logErr);
  }

  return NextResponse.json({ success: true });
}
