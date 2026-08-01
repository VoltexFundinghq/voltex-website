import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { logAdminAuditEvent } from "@/lib/database/admin-admins";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const userQuery = await serviceClient.from("users").select("email").eq("id", id).single();
  const targetEmail = (userQuery.data as { email: string } | null)?.email;
  if (!targetEmail) return NextResponse.json({ error: "Admin not found" }, { status: 404 });

  const { error } = await serviceClient.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAuditEvent(serviceClient, id, "Reset Password", `Password reset triggered by ${admin.email}`);
  return NextResponse.json({ success: true });
}
