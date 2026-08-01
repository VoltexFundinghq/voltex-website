import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAuditEvent } from "@/lib/database/admin-admins";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (id === admin.id) return NextResponse.json({ error: "You cannot suspend your own account" }, { status: 400 });

  const body = await request.json();
  const suspend = Boolean(body.suspend);

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("users") as any).update({ is_suspended: suspend }).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  await logAdminAuditEvent(serviceClient, id, suspend ? "Suspended Admin" : "Activated Admin", `${suspend ? "Suspended" : "Activated"} by ${admin.email}`);
  return NextResponse.json({ success: true });
}
