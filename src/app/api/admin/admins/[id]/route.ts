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

  // Delete FIRST, log AFTER — logging a "Deleted" event before the
  // deletion is confirmed is backwards, and previously meant a
  // logging failure (e.g. a duplicate unique-constraint hit from a
  // retried click) could crash the whole route before the real
  // deletion ever ran.
  const { error } = await serviceClient.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await logAdminAuditEvent(serviceClient, id, "Deleted Admin", `Deleted by ${admin.email}`);
  } catch (logErr) {
    // Never let a logging hiccup mask a real, already-successful
    // deletion — the account is genuinely gone either way.
    console.error("Failed to log Deleted Admin audit event (non-fatal):", logErr);
  }

  return NextResponse.json({ success: true });
}
