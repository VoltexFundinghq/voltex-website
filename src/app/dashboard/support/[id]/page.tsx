"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import CustomerHeader from "@/components/customer/CustomerHeader";
import { Paperclip, Send, Image as ImageIcon } from "lucide-react";

interface TicketMessage {
  id: string;
  senderType: "customer" | "admin";
  senderName: string | null;
  message: string | null;
  attachmentId: string | null;
  attachmentFilename: string | null;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  customer: { name: string | null; email: string };
  createdAt: string;
  messages: TicketMessage[];
}

function AttachmentImage({ messageId, filename }: { messageId: string; filename: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/support/attachments/${messageId}`).then((r) => r.json()).then((d) => setUrl(d.url ?? null));
  }, [messageId]);

  if (!url) return <div className="mt-2 h-32 w-full max-w-xs animate-pulse rounded-lg bg-white/5" />;
  return <img src={url} alt={filename ?? "attachment"} className="mt-2 max-w-xs rounded-lg border border-white/10" />;
}

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch(`/api/support/tickets/${ticketId}`).then((r) => r.json()).then(setTicket);
  }
  useEffect(() => { load(); }, [ticketId]);

  async function handleSend() {
    if (!message.trim() && !file) return;
    setSending(true);
    try {
      const formData = new FormData();
      if (message.trim()) formData.append("message", message.trim());
      if (file) formData.append("file", file);
      const res = await fetch(`/api/support/tickets/${ticketId}/attachments`, { method: "POST", body: formData });
      if (res.ok) {
        setMessage("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        load();
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to send.");
      }
    } catch { alert("Failed to send."); }
    setSending(false);
  }

  if (!ticket) return <div><CustomerHeader title="Support" /><p className="p-8 text-sm text-zinc-500">Loading...</p></div>;

  return (
    <div>
      <CustomerHeader title={ticket.subject} />
      <div className="p-4 sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize text-zinc-400">{ticket.status}</span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs capitalize text-zinc-400">{ticket.priority} priority</span>
        </div>

        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-6">
          {ticket.messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderType === "customer" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl p-3 ${m.senderType === "customer" ? "bg-[#D4AF37]/10" : "bg-white/5"}`}>
                <p className="text-xs font-medium text-zinc-400">{m.senderType === "customer" ? "You" : (m.senderName ?? "Support")}</p>
                {m.message && <p className="mt-1 text-sm text-zinc-200">{m.message}</p>}
                {m.attachmentId && <AttachmentImage messageId={m.attachmentId} filename={m.attachmentFilename} />}
                <p className="mt-1 text-[10px] text-zinc-600">{new Date(m.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your reply..."
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
          />
          {file && (
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
              <ImageIcon className="h-3.5 w-3.5" /> {file.name}
              <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-red-400 hover:underline">Remove</button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
              <Paperclip className="h-3.5 w-3.5" /> Attach Image
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
            </label>
            <button onClick={handleSend} disabled={sending || (!message.trim() && !file)} className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50">
              <Send className="h-3.5 w-3.5" /> {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
