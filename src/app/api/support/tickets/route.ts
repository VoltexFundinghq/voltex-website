import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyTickets, createTicket } from "@/lib/database/support-tickets";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tickets = await getMyTickets(user.id);
  return NextResponse.json({ tickets });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { subject, message, priority } = body;
  if (!subject?.trim() || !message?.trim()) return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });

  const ticketId = await createTicket(user.id, subject.trim(), message.trim(), priority ?? "normal");
  if (!ticketId) return NextResponse.json({ error: "Failed to create ticket." }, { status: 500 });

  return NextResponse.json({ success: true, ticketId });
}
