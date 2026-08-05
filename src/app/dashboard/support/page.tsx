"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CustomerHeader from "@/components/customer/CustomerHeader";
import Link from "next/link";
import { Plus, X } from "lucide-react";

interface TicketSummary {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  lastMessagePreview: string | null;
}

function statusBadge(status: string): string {
  if (status === "open") return "bg-amber-400/10 text-amber-400";
  if (status === "pending") return "bg-blue-400/10 text-blue-400";
  return "bg-emerald-400/10 text-emerald-400";
}
function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function NewTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!subject.trim() || !message.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message, priority }) });
      const data = await res.json();
      if (res.ok) onCreated(data.ticketId); else alert(data.error ?? "Failed to create ticket.");
    } catch { alert("Failed to create ticket."); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-[#D4AF37]/20 bg-[#0a0a0a] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">New Support Ticket</h3><button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-[#D4AF37]/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-[#D4AF37]/40 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-[#D4AF37]/40 focus:outline-none">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving || !subject.trim() || !message.trim()} className="mt-4 w-full rounded-lg bg-[#D4AF37] py-2 text-sm font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50">
          {saving ? "Submitting..." : "Submit Ticket"}
        </button>
      </div>
    </div>
  );
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [showNew, setShowNew] = useState(false);

  function load() {
    fetch("/api/support/tickets").then((r) => r.json()).then((d) => setTickets(d.tickets ?? []));
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <CustomerHeader title="Support" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="flex justify-end">
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#F5D573]">
            <Plus className="h-3.5 w-3.5" /> New Ticket
          </button>
        </div>

        {tickets === null ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-zinc-400">No support tickets yet.</p>
            <p className="mt-1 text-xs text-zinc-600">Need help? Open a ticket and we'll get back to you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Link key={t.id} href={`/dashboard/support/${t.id}`} className="block rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-[#D4AF37]/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">{t.subject}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${statusBadge(t.status)}`}>{t.status}</span>
                </div>
                {t.lastMessagePreview && <p className="mt-1 truncate text-xs text-zinc-500">{t.lastMessagePreview}</p>}
                <p className="mt-1 text-[11px] text-zinc-600">Updated {timeAgo(t.updatedAt)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  );
}
