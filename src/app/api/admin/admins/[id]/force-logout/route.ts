import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAuditEvent } from "@/lib/database/admin-admins";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const { error } = await (serviceClient.rpc as any)("force_logout_admin", { p_user_id: id });
  if (error) return NextResponse.json({ error: "Failed to force logout" }, { status: 500 });

  await logAdminAuditEvent(serviceClient, id, "Force Logout", `Forced logout by ${admin.email}`);
  return NextResponse.json({ success: true });
}
