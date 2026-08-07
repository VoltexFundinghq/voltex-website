import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const { error } = await (serviceClient.from("trading_accounts") as any)
    .update({ status: "available", last_verified_alive_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "flagged");

  if (error) return NextResponse.json({ error: "Failed to restore" }, { status: 500 });
  return NextResponse.json({ success: true });
}
