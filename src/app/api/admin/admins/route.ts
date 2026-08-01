import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getAdminsList, logAdminAuditEvent } from "@/lib/database/admin-admins";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const filter = searchParams.get("filter") ?? "all";

  const admins = await getAdminsList({ search, filter });
  return NextResponse.json({ admins });
}

export async function POST(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { fullName, email, role } = body;
  if (!fullName || !email || !role) return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });

  const serviceClient = createServiceClient();

  const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (inviteError || !invited?.user) {
    return NextResponse.json({ error: inviteError?.message ?? "Failed to send invitation" }, { status: 500 });
  }

  const { error: profileError } = await (serviceClient.from("users") as any).upsert({
    id: invited.user.id,
    email,
    full_name: fullName,
    is_admin: true,
    admin_role: role,
  });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  await logAdminAuditEvent(serviceClient, invited.user.id, "Created Admin", `Invited as ${role} by ${admin.email}`);

  return NextResponse.json({ success: true });
}
