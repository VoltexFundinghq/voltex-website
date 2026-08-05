import { createServiceClient } from "@/lib/supabase/service";

export interface TicketMessage {
  id: string;
  senderType: "customer" | "admin";
  senderName: string | null;
  message: string | null;
  attachmentId: string | null;
  attachmentFilename: string | null;
  createdAt: string;
}

export interface TicketSummary {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
}

export interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  customer: { name: string | null; email: string };
  createdAt: string;
  messages: TicketMessage[];
}

async function enrichMessages(serviceClient: ReturnType<typeof createServiceClient>, ticketId: string): Promise<TicketMessage[]> {
  const query = await serviceClient.from("support_ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
  const rows = ((query.data ?? []) as unknown as any[]);

  const senderIds = [...new Set(rows.map((r) => r.sender_id))];
  const usersQuery = senderIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", senderIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  return rows.map((r) => {
    const sender = userById.get(r.sender_id);
    return {
      id: r.id,
      senderType: r.sender_type,
      senderName: sender?.full_name ?? sender?.email ?? null,
      message: r.message,
      attachmentId: r.attachment_path ? r.id : null,
      attachmentFilename: r.attachment_filename,
      createdAt: r.created_at,
    };
  });
}

export async function getMyTickets(userId: string): Promise<TicketSummary[]> {
  const serviceClient = createServiceClient();
  const query = await serviceClient.from("support_tickets").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  const rows = ((query.data ?? []) as unknown as any[]);

  const ticketIds = rows.map((r) => r.id);
  const messagesQuery = ticketIds.length > 0
    ? await serviceClient.from("support_ticket_messages").select("ticket_id, message, created_at").in("ticket_id", ticketIds).order("created_at", { ascending: false })
    : { data: [] as any[] };
  const lastMessageByTicket = new Map<string, string>();
  for (const m of ((messagesQuery.data ?? []) as unknown as any[])) {
    if (!lastMessageByTicket.has(m.ticket_id) && m.message) lastMessageByTicket.set(m.ticket_id, m.message);
  }

  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    status: r.status,
    priority: r.priority,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastMessagePreview: lastMessageByTicket.get(r.id) ?? null,
  }));
}

export async function createTicket(userId: string, subject: string, firstMessage: string, priority: string): Promise<string | null> {
  const serviceClient = createServiceClient();
  const { data, error } = await (serviceClient.from("support_tickets") as any).insert({ user_id: userId, subject, priority }).select("id").single();
  if (error || !data) return null;

  await (serviceClient.from("support_ticket_messages") as any).insert({
    ticket_id: data.id,
    sender_type: "customer",
    sender_id: userId,
    message: firstMessage,
  });

  return data.id;
}

export async function getTicketDetail(ticketId: string): Promise<TicketDetail | null> {
  const serviceClient = createServiceClient();

  const ticketQuery = await serviceClient.from("support_tickets").select("*").eq("id", ticketId).single();
  const ticket = ticketQuery.data as any;
  if (!ticket) return null;

  const userQuery = await serviceClient.from("users").select("full_name, email").eq("id", ticket.user_id).single();
  const user = userQuery.data as { full_name: string | null; email: string } | null;

  const messages = await enrichMessages(serviceClient, ticketId);

  return {
    id: ticket.id,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    customer: { name: user?.full_name ?? null, email: user?.email ?? "unknown" },
    createdAt: ticket.created_at,
    messages,
  };
}

export interface AdminTicketRow {
  id: string;
  subject: string;
  customerName: string | null;
  customerEmail: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketStats {
  open: number;
  pending: number;
  resolved: number;
  totalToday: number;
}

export async function getTicketStats(): Promise<TicketStats> {
  const serviceClient = createServiceClient();
  const todayStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())).toISOString();

  const query = await serviceClient.from("support_tickets").select("status, created_at");
  const rows = ((query.data ?? []) as unknown as { status: string; created_at: string }[]);

  return {
    open: rows.filter((r) => r.status === "open").length,
    pending: rows.filter((r) => r.status === "pending").length,
    resolved: rows.filter((r) => r.status === "resolved" || r.status === "closed").length,
    totalToday: rows.filter((r) => r.created_at >= todayStart).length,
  };
}

export async function getAdminTicketsPage(params: { search?: string; filter?: string; page: number; pageSize: number }) {
  const serviceClient = createServiceClient();
  const { search, filter = "all", page, pageSize } = params;

  let query = serviceClient.from("support_tickets").select("*");
  if (["open", "pending", "resolved", "closed"].includes(filter)) query = query.eq("status", filter);

  const allQuery = await query.order("updated_at", { ascending: false });
  const rows = ((allQuery.data ?? []) as unknown as any[]);

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const usersQuery = userIds.length > 0 ? await serviceClient.from("users").select("id, full_name, email").in("id", userIds) : { data: [] as any[] };
  const userById = new Map(((usersQuery.data ?? []) as unknown as any[]).map((u) => [u.id, u]));

  let enriched: AdminTicketRow[] = rows.map((r) => {
    const user = userById.get(r.user_id);
    return {
      id: r.id,
      subject: r.subject,
      customerName: user?.full_name ?? null,
      customerEmail: user?.email ?? "unknown",
      status: r.status,
      priority: r.priority,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    enriched = enriched.filter((t) => t.subject.toLowerCase().includes(term) || t.customerEmail.toLowerCase().includes(term) || (t.customerName ?? "").toLowerCase().includes(term));
  }

  const totalCount = enriched.length;
  const pageItems = enriched.slice((page - 1) * pageSize, page * pageSize);
  return { tickets: pageItems, totalCount };
}

export async function updateTicketStatus(ticketId: string, status: string): Promise<boolean> {
  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("support_tickets") as any).update({ status, updated_at: new Date().toISOString() }).eq("id", ticketId);
  return !error;
}
