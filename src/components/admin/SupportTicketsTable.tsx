"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronDown, ChevronRight, Paperclip, Send } from "lucide-react";
import { useRouter } from "next/navigation";

interface TicketRow {
  id: string;
  subject: string;
  customerName: string | null;
  customerEmail: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

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

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];
const STATUS_OPTIONS = ["open", "pending", "resolved", "closed"];
const PAGE_SIZE = 20;

function fmtDateTime(dateStr: string): string { return new Date(dateStr).toLocaleString(); }
function statusBadge(status: string): string {
  if (status === "open") return "bg-amber-400/10 text-amber-400";
  if (status === "pending") return "bg-blue-400/10 text-blue-400";
  if (status === "resolved") return "bg-emerald-400/10 text-emerald-400";
  return "bg-white/5 text-zinc-400";
}
function priorityBadge(p: string): string {
  if (p === "urgent") return "text-red-400";
  if (p === "high") return "text-amber-400";
  return "text-zinc-500";
}

function AttachmentImage({ messageId, filename }: { messageId: string; filename: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/support/attachments/${messageId}`).then((r) => r.json()).then((d) => setUrl(d.url ?? null)); }, [messageId]);
  if (!url) return <div className="mt-2 h-32 w-full max-w-xs animate-pulse rounded-lg bg-white/5" />;
  return <img src={url} alt={filename ?? "attachment"} className="mt-2 max-w-xs rounded-lg border border-white/10" />;
}

function DetailPanel({ ticketId, onUpdated }: { ticketId: string; onUpdated: () => void }) {
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() { fetch(`/api/admin/users`); fetch(`/api/support/tickets/${ticketId}`).then((r) => r.json()).then(setDetail); }
  useEffect(() => { load(); }, [ticketId]);

  async function handleReply() {
    if (!reply.trim() && !file) return;
    setBusy(true);
    try {
      const formData = new FormData();
      if (reply.trim()) formData.append("message", reply.trim());
      if (file) formData.append("file", file);
      const res = await fetch(`/api/support/tickets/${ticketId}/attachments`, { method: "POST", body: formData });
      if (res.ok) { setReply(""); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; load(); onUpdated(); } else { const d = await res.json(); alert(d.error ?? "Failed."); }
    } catch { alert("Failed."); }
    setBusy(false);
  }

  async function handleStatusChange(status: string) {
    setBusy(true);
    try { await fetch(`/api/admin/support-tickets/${ticketId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); load(); onUpdated(); } catch { alert("Failed."); }
    setBusy(false);
  }

  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;

  return (
    <div className="bg-black/30 p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-400">{detail.customer.name ?? "—"} · {detail.customer.email}</p>
        <select value={detail.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={busy} className="rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none">
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border border-white/10 p-4">
        {detail.messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderType === "admin" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-xl p-3 ${m.senderType === "admin" ? "bg-[#D4AF37]/10" : "bg-white/5"}`}>
              <p className="text-xs font-medium text-zinc-400">{m.senderType === "admin" ? (m.senderName ?? "Admin") : "Customer"}</p>
              {m.message && <p className="mt-1 text-sm text-zinc-200">{m.message}</p>}
              {m.attachmentId && <AttachmentImage messageId={m.attachmentId} filename={m.attachmentFilename} />}
              <p className="mt-1 text-[10px] text-zinc-600">{fmtDateTime(m.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 p-3">
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to customer..." rows={2} className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none" />
        {file && <p className="mt-1 text-xs text-zinc-400">{file.name} <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-red-400 hover:underline">Remove</button></p>}
        <div className="mt-2 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5">
            <Paperclip className="h-3 w-3" /> Attach
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
          </label>
          <button onClick={handleReply} disabled={busy || (!reply.trim() && !file)} className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50">
            <Send className="h-3 w-3" /> Reply
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupportTicketsTable({ initialTickets, initialTotalCount }: { initialTickets: TicketRow[]; initialTotalCount: number }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTickets = useCallback((searchVal: string, filterVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: filterVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/support-tickets?${params}`).then((r) => r.json()).then((data) => { setTickets(data.tickets); setTotalCount(data.totalCount); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchTickets(search, filter, page), search ? 350 : 0); return () => clearTimeout(t); }, [search, filter, page, fetchTickets]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search subject, trader, email..." className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === f.value ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">Loading...</p></div>
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">No support tickets yet.</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Trader</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <>
                    <tr key={t.id} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-3 text-zinc-600">{expandedId === t.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                      <td className="px-4 py-3 text-zinc-200">{t.subject}</td>
                      <td className="px-4 py-3"><p className="text-zinc-300">{t.customerName ?? "—"}</p><p className="text-xs text-zinc-600">{t.customerEmail}</p></td>
                      <td className={`px-4 py-3 text-xs capitalize ${priorityBadge(t.priority)}`}>{t.priority}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${statusBadge(t.status)}`}>{t.status}</span></td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(t.updatedAt)}</td>
                    </tr>
                    {expandedId === t.id && <tr key={`${t.id}-d`}><td colSpan={6} className="p-0"><DetailPanel ticketId={t.id} onUpdated={() => fetchTickets(search, filter, page)} /></td></tr>}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-zinc-500">Page {page} of {totalPages} ({totalCount} total)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-400 disabled:opacity-30">Previous</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-white/10 px-3 py-1.5 text-zinc-400 disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
