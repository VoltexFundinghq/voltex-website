import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: ticketId } = await params;
  const serviceClient = createServiceClient();

  const ticketQuery = await serviceClient.from("support_tickets").select("user_id").eq("id", ticketId).single();
  const ticket = ticketQuery.data as { user_id: string } | null;
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const isOwner = ticket.user_id === user.id;
  let isAdmin = false;
  if (!isOwner) {
    const profileQuery = await serviceClient.from("users").select("is_admin").eq("id", user.id).single();
    isAdmin = (profileQuery.data as { is_admin: boolean } | null)?.is_admin ?? false;
  }
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const message = (formData.get("message") as string | null) ?? "";

  if (!file && !message.trim()) {
    return NextResponse.json({ error: "A message or attachment is required." }, { status: 400 });
  }

  let attachmentPath: string | null = null;
  let attachmentFilename: string | null = null;

  if (file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WEBP, or GIF images are allowed." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image must be under 5MB." }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${ticketId}/${crypto.randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await serviceClient.storage.from("support-attachments").upload(path, bytes, { contentType: file.type });
    if (uploadError) return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });

    attachmentPath = path;
    attachmentFilename = file.name;
  }

  const senderType = isOwner ? "customer" : "admin";
  const { error: insertError } = await (serviceClient.from("support_ticket_messages") as any).insert({
    ticket_id: ticketId,
    sender_type: senderType,
    sender_id: user.id,
    message: message.trim() || null,
    attachment_path: attachmentPath,
    attachment_filename: attachmentFilename,
  });
  if (insertError) return NextResponse.json({ error: "Failed to save message." }, { status: 500 });

  await (serviceClient.from("support_tickets") as any).update({ updated_at: new Date().toISOString(), status: senderType === "admin" ? "pending" : "open" }).eq("id", ticketId);

  return NextResponse.json({ success: true });
}
