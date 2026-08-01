import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { note } = body;
  if (!note || !note.trim()) return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("manual_review_notes") as any).insert({ review_id: id, admin_id: admin.id, note: note.trim() });
  if (error) return NextResponse.json({ error: "Failed to save note" }, { status: 500 });

  return NextResponse.json({ success: true });
}
