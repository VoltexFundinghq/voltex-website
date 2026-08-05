import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { updateTicketStatus } from "@/lib/database/support-tickets";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status } = body;
  if (!["open", "pending", "resolved", "closed"].includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const success = await updateTicketStatus(id, status);
  if (!success) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  return NextResponse.json({ success: true });
}
