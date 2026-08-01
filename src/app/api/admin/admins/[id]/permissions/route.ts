import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { module, level } = body;
  if (!["no_access", "read", "write", "full"].includes(level)) return NextResponse.json({ error: "Invalid level" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("admin_permissions") as any).upsert(
    { admin_user_id: id, module, permission_level: level, updated_at: new Date().toISOString() },
    { onConflict: "admin_user_id,module" }
  );
  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  return NextResponse.json({ success: true });
}
