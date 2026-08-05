import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messageId } = await params;
  const serviceClient = createServiceClient();

  const messageQuery = await serviceClient.from("support_ticket_messages").select("attachment_path, ticket_id").eq("id", messageId).single();
  const message = messageQuery.data as { attachment_path: string | null; ticket_id: string } | null;
  if (!message || !message.attachment_path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ticketQuery = await serviceClient.from("support_tickets").select("user_id").eq("id", message.ticket_id).single();
  const ticket = ticketQuery.data as { user_id: string } | null;
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = ticket.user_id === user.id;
  let isAdmin = false;
  if (!isOwner) {
    const profileQuery = await serviceClient.from("users").select("is_admin").eq("id", user.id).single();
    isAdmin = (profileQuery.data as { is_admin: boolean } | null)?.is_admin ?? false;
  }
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { data: signedUrlData, error } = await serviceClient.storage.from("support-attachments").createSignedUrl(message.attachment_path, 300);
  if (error || !signedUrlData) return NextResponse.json({ error: "Failed to generate access link" }, { status: 500 });

  return NextResponse.json({ url: signedUrlData.signedUrl });
}
