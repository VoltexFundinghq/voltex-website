import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getTicketDetail } from "@/lib/database/support-tickets";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const ticketQuery = await serviceClient.from("support_tickets").select("user_id").eq("id", id).single();
  const ticket = ticketQuery.data as { user_id: string } | null;
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = ticket.user_id === user.id;
  let isAdmin = false;
  if (!isOwner) {
    const profileQuery = await serviceClient.from("users").select("is_admin").eq("id", user.id).single();
    isAdmin = (profileQuery.data as { is_admin: boolean } | null)?.is_admin ?? false;
  }
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const detail = await getTicketDetail(id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(detail);
}
