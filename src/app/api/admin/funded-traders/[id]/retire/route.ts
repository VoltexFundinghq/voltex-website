import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const { error } = await (serviceClient.rpc as any)("complete_user_challenge", { p_user_challenge_id: id, p_outcome: "failed" });
  if (error) return NextResponse.json({ error: "Failed to retire account" }, { status: 500 });

  return NextResponse.json({ success: true });
}
