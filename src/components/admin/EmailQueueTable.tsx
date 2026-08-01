"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";

interface EmailRow {
  id: string;
  sentAt: string;
  recipientName: string | null;
  recipientEmail: string | null;
  subject: string;
  category: string;
}

const CATEGORIES = ["all", "Credentials", "Risk Alert", "Challenge Lifecycle", "Payout", "General"];
const PAGE_SIZE = 25;

function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}
function categoryBadge(c: string): string {
  if (c === "Credentials") return "bg-blue-400/10 text-blue-400";
  if (c === "Risk Alert") return "bg-red-400/10 text-red-400";
  if (c === "Challenge Lifecycle") return "bg-[#D4AF37]/10 text-[#D4AF37]";
  if (c === "Payout") return "bg-emerald-400/10 text-emerald-400";
  return "bg-white/5 text-zinc-400";
}

export default function EmailQueueTable({ initialEvents, initialTotalCount }: { initialEvents: EmailRow[]; initialTotalCount: number }) {
  const [events, setEvents] = useState(initialEvents);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback((searchVal: string, categoryVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ category: categoryVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    fetch(`/api/admin/email-queue?${params}`).then((r) => r.json()).then((data) => { setEvents(data.events); setTotalCount(data.totalCount); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchEvents(search, category, page), search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [search, category, page, fetchEvents]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search recipient, subject..." className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => { setCategory(c); setPage(1); }} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === c ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">Loading...</p></div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">No emails have been sent yet.</p></div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-medium">Sent</th>
                  <th className="px-4 py-3 font-medium">Recipient</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-white/5">
                    <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(e.sentAt)}</td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-300">{e.recipientName ?? "—"}</p>
                      <p className="text-xs text-zinc-600">{e.recipientEmail ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{e.subject}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${categoryBadge(e.category)}`}>{e.category}</span></td>
                    <td className="px-4 py-3 text-xs text-zinc-500">Sent</td>
                  </tr>
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
