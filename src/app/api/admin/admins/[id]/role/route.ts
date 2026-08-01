import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAuditEvent } from "@/lib/database/admin-admins";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { role } = body;
  if (!["super_admin", "operations", "risk_manager", "finance", "support"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("users") as any).update({ admin_role: role }).eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  await logAdminAuditEvent(serviceClient, id, "Changed Role", `Role changed to ${role} by ${admin.email}`);
  return NextResponse.json({ success: true });
}
