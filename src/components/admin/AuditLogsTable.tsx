"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, ChevronDown, ChevronRight, MoreVertical, User, FileText, Wallet, Copy, CheckCircle2 } from "lucide-react";

interface AuditRow {
  id: string;
  timestamp: string;
  eventName: string;
  category: string;
  userName: string | null;
  source: string;
  result: string;
}

interface AuditDetail {
  eventId: string;
  eventName: string;
  category: string;
  description: string | null;
  result: string;
  user: { name: string | null; email: string | null; username: string | null; country: string | null } | null;
  challenge: { id: string; size: number | null; phase: number; status: string } | null;
  tradingAccount: { mt5Login: string | null; server: string | null; size: number | null; status: string } | null;
  source: string;
  relatedIds: { challengeId: string | null; purchaseId: string | null; accountId: string | null; payoutId: string | null };
  nearbyTimeline: { eventName: string; timestamp: string }[];
}

const CATEGORY_FILTERS = ["all", "Authentication", "Payments", "Provisioning", "Challenge", "Inventory", "Risk", "Payout"];
const RESULT_FILTERS = [
  { value: "", label: "All Results" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "warning", label: "Warning" },
  { value: "information", label: "Information" },
];
const DATE_FILTERS = [
  { value: "", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

const PAGE_SIZE = 25;

function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}
function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}

function resultBadge(r: string): string {
  if (r === "success") return "bg-emerald-400/10 text-emerald-400";
  if (r === "failed") return "bg-red-400/10 text-red-400";
  if (r === "warning") return "bg-amber-400/10 text-amber-400";
  return "bg-blue-400/10 text-blue-400";
}

function DetailPanel({ eventId }: { eventId: string }) {
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/audit-logs/${eventId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [eventId]);

  async function copyEventId() {
    await navigator.clipboard.writeText(eventId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load detail.</div>;

  return (
    <div className="bg-black/30 p-6">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Event Details</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-zinc-600">{detail.eventId.slice(0, 8)}...</p>
                <button onClick={copyEventId} className="text-zinc-500 hover:text-white">
                  {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
              <p className="text-zinc-400">Event: <span className="text-zinc-200">{detail.eventName}</span></p>
              <p className="text-zinc-400">Category: <span className="text-zinc-200">{detail.category}</span></p>
              <p className="text-zinc-400">Description: <span className="text-zinc-200">{detail.description ?? "—"}</span></p>
              <p className="text-zinc-400">Result: <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${resultBadge(detail.result)}`}>{detail.result}</span></p>
              <p className="text-zinc-400">Source: <span className="text-zinc-200">{detail.source}</span></p>
            </div>
          </div>
          {detail.user && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">User</h4>
              <div className="space-y-1 text-sm">
                <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.user.name ?? "—"}</span></p>
                <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.user.email ?? "—"}</span></p>
                <p className="text-zinc-400">Username: <span className="text-zinc-200">{detail.user.username ?? "—"}</span></p>
                <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.user.country ?? "—"}</span></p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {detail.challenge && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Challenge</h4>
              <div className="space-y-1 text-sm">
                <p className="text-zinc-400">Size: <span className="text-zinc-200">{fmtMoney(detail.challenge.size)}</span></p>
                <p className="text-zinc-400">Phase: <span className="text-zinc-200">{detail.challenge.phase}</span></p>
                <p className="text-zinc-400">Status: <span className="text-zinc-200">{detail.challenge.status}</span></p>
              </div>
            </div>
          )}
          {detail.tradingAccount && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Trading Account</h4>
              <div className="space-y-1 text-sm">
                <p className="text-zinc-400">MT5 Login: <span className="font-mono text-zinc-200">{detail.tradingAccount.mt5Login ?? "—"}</span></p>
                <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.tradingAccount.server ?? "—"}</span></p>
                <p className="text-zinc-400">Status: <span className="text-zinc-200">{detail.tradingAccount.status}</span></p>
              </div>
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Nearby Timeline (same trader)</h4>
          {detail.nearbyTimeline.length === 0 ? (
            <p className="text-sm text-zinc-600">No other events recorded.</p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-2">
              {detail.nearbyTimeline.map((e, i) => (
                <div key={i} className="border-b border-white/5 pb-1.5 text-xs last:border-0">
                  <p className="text-zinc-300">{e.eventName}</p>
                  <p className="text-zinc-600">{fmtDateTime(e.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const items = [
    { label: "View Trader", icon: User },
    { label: "View Challenge", icon: FileText },
    { label: "View Trading Account", icon: Wallet },
    { label: "Copy Event ID", icon: Copy },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white">
        <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-white/10 bg-[#0a0a0a] py-1 shadow-xl">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/5">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AuditLogsTable({ initialEvents, initialTotalCount }: { initialEvents: AuditRow[]; initialTotalCount: number }) {
  const [events, setEvents] = useState(initialEvents);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [result, setResult] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback((searchVal: string, categoryVal: string, resultVal: string, dateVal: string, pageVal: number) => {
    setLoading(true);
    const params = new URLSearchParams({ category: categoryVal, page: String(pageVal) });
    if (searchVal) params.set("search", searchVal);
    if (resultVal) params.set("result", resultVal);
    if (dateVal) params.set("dateRange", dateVal);
    fetch(`/api/admin/audit-logs?${params}`)
      .then((r) => r.json())
      .then((data) => { setEvents(data.events); setTotalCount(data.totalCount); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => fetchEvents(search, category, result, dateRange, page), search ? 350 : 0);
    return () => clearTimeout(debounce);
  }, [search, category, result, dateRange, page, fetchEvents]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" strokeWidth={1.75} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search user, email, event, challenge ID..."
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-[#D4AF37]/40 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <select value={result} onChange={(e) => { setResult(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 focus:border-[#D4AF37]/40 focus:outline-none">
              {RESULT_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setPage(1); }} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 focus:border-[#D4AF37]/40 focus:outline-none">
              {DATE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_FILTERS.map((c) => (
            <button key={c} onClick={() => { setCategory(c); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === c ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center"><p className="text-zinc-500">Loading...</p></div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-zinc-500">No audit events have been recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="w-8 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <>
                    <tr key={e.id} onClick={() => setExpandedId(expandedId === e.id ? null : e.id)} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-2 py-3 text-zinc-600">{expandedId === e.id ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(e.timestamp)}</td>
                      <td className="px-4 py-3 text-zinc-300">{e.eventName}</td>
                      <td className="px-4 py-3 text-zinc-400">{e.category}</td>
                      <td className="px-4 py-3 text-zinc-400">{e.userName ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">{e.source}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${resultBadge(e.result)}`}>{e.result}</span></td>
                      <td className="px-2 py-3"><ActionsMenu /></td>
                    </tr>
                    {expandedId === e.id && (
                      <tr key={`${e.id}-detail`}><td colSpan={8} className="p-0"><DetailPanel eventId={e.id} /></td></tr>
                    )}
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
