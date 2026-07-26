"use client";

import { useState, useEffect } from "react";
import { RotateCw, XCircle, ChevronDown, ChevronRight, CheckCircle2, Circle } from "lucide-react";

interface QueueRow {
  challengeId: string;
  email: string;
  fullName: string | null;
  accountSize: number | null;
  phase: number;
  purchaseReference: string | null;
  paymentStatus: string | null;
  queueStatus: string;
  assignedLogin: string | null;
  assignedServer: string | null;
  createdAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  queuePosition: number | null;
  availableForSize: number;
}

interface TimelineStep { label: string; timestamp: string | null; reached: boolean }
interface QueueDetail {
  customer: { name: string | null; email: string; country: string | null };
  purchaseReference: string | null;
  challengeSize: number | null;
  assignedAccount: { login: string | null; server: string | null; stage: string } | null;
  timeline: TimelineStep[];
  queueWaitSeconds: number;
  provisionDurationSeconds: number | null;
  queueStatus: string;
}

function fmtMoney(v: number | null): string {
  if (v === null) return "—";
  return `₦${v.toLocaleString()}`;
}
function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString();
}
function fmtDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 5) return "Instant";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
}

function statusBadge(status: string): string {
  if (status === "Waiting") return "bg-amber-400/10 text-amber-400";
  if (status === "Completed") return "bg-emerald-400/10 text-emerald-400";
  if (status === "Failed") return "bg-red-400/10 text-red-400";
  return "bg-white/5 text-zinc-400";
}

function DetailPanel({ challengeId }: { challengeId: string }) {
  const [detail, setDetail] = useState<QueueDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/provisioning-queue/${challengeId}`)
      .then((r) => r.json())
      .then((data) => { setDetail(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [challengeId]);

  if (loading) return <div className="bg-black/30 p-6 text-sm text-zinc-500">Loading...</div>;
  if (!detail) return <div className="bg-black/30 p-6 text-sm text-zinc-600">Could not load detail.</div>;

  return (
    <div className="grid gap-6 bg-black/30 p-6 md:grid-cols-3">
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Customer</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Name: <span className="text-zinc-200">{detail.customer.name ?? "—"}</span></p>
            <p className="text-zinc-400">Email: <span className="text-zinc-200">{detail.customer.email}</span></p>
            <p className="text-zinc-400">Country: <span className="text-zinc-200">{detail.customer.country ?? "—"}</span></p>
            <p className="text-zinc-400">Purchase Ref: <span className="font-mono text-xs text-zinc-500">{detail.purchaseReference ?? "—"}</span></p>
          </div>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Assigned Account</h4>
          {detail.assignedAccount ? (
            <div className="space-y-1 text-sm">
              <p className="text-zinc-400">MT5 Login: <span className="font-mono text-zinc-200">{detail.assignedAccount.login ?? "—"}</span></p>
              <p className="text-zinc-400">Server: <span className="text-zinc-200">{detail.assignedAccount.server ?? "—"}</span></p>
              <p className="text-zinc-400">Stage: <span className="text-zinc-200">{detail.assignedAccount.stage}</span></p>
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Not yet assigned — challenge size {fmtMoney(detail.challengeSize)}</p>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timing</h4>
          <div className="space-y-1 text-sm">
            <p className="text-zinc-400">Queue Wait: <span className="text-zinc-200">{fmtDuration(detail.queueWaitSeconds)}</span></p>
            <p className="text-zinc-400">Provision Duration: <span className="text-zinc-200">{fmtDuration(detail.provisionDurationSeconds)}</span></p>
          </div>
        </div>
      </div>

      <div className="md:col-span-2">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">Timeline</h4>
        <div>
          {detail.timeline.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${step.reached ? "bg-[#D4AF37]" : "bg-white/10"}`}>
                  {step.reached ? <CheckCircle2 className="h-3.5 w-3.5 text-black" strokeWidth={2.5} /> : <Circle className="h-2.5 w-2.5 text-zinc-600" strokeWidth={2} />}
                </div>
                {i < detail.timeline.length - 1 && <div className={`w-px flex-1 ${step.reached ? "bg-[#D4AF37]/40" : "bg-white/10"}`} style={{ minHeight: "20px" }} />}
              </div>
              <div className="pb-4">
                <p className={`text-sm ${step.reached ? "text-zinc-200" : "text-zinc-600"}`}>{step.label}</p>
                <p className="text-xs text-zinc-600">{step.timestamp ? fmtDateTime(step.timestamp) : "Not yet reached"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProvisioningQueueTable({ initialQueue }: { initialQueue: QueueRow[] }) {
  const [queue, setQueue] = useState(initialQueue);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleRetry(challengeId: string) {
    setBusyId(challengeId);
    try {
      const res = await fetch(`/api/admin/provisioning-queue/${challengeId}/retry`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setQueue((prev) => prev.map((q) => (q.challengeId === challengeId ? { ...q, queueStatus: "Completed", assignedLogin: data.login } : q)));
      } else {
        alert(data.error ?? "Failed to allocate.");
      }
    } catch {
      alert("Failed to allocate.");
    }
    setBusyId(null);
  }

  async function handleCancel(challengeId: string) {
    if (!confirm("Cancel this waiting request? This marks it as failed and stops it from being retried.")) return;
    setBusyId(challengeId);
    try {
      const res = await fetch(`/api/admin/provisioning-queue/${challengeId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setQueue((prev) => prev.map((q) => (q.challengeId === challengeId ? { ...q, queueStatus: "Cancelled" } : q)));
      } else {
        alert(data.error ?? "Failed to cancel.");
      }
    } catch {
      alert("Failed to cancel.");
    }
    setBusyId(null);
  }

  if (queue.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-12 text-center">
        <p className="text-zinc-500">No provisioning activity yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="w-8 px-2 py-3"></th>
              <th className="px-4 py-3 font-medium">Trader</th>
              <th className="px-4 py-3 font-medium text-right">Size</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">MT5 Login</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((q) => (
              <>
                <tr key={q.challengeId} onClick={() => setExpandedId(expandedId === q.challengeId ? null : q.challengeId)} className={`cursor-pointer border-b border-white/5 hover:bg-white/[0.02] ${q.queueStatus === "Failed" ? "bg-red-400/[0.03]" : ""}`}>
                  <td className="px-2 py-3 text-zinc-600">{expandedId === q.challengeId ? <ChevronDown className="h-4 w-4" strokeWidth={1.75} /> : <ChevronRight className="h-4 w-4" strokeWidth={1.75} />}</td>
                  <td className="px-4 py-3">
                    <p className="text-zinc-300">{q.fullName ?? "—"}</p>
                    <p className="text-xs text-zinc-600">{q.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-300">{fmtMoney(q.accountSize)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(q.queueStatus)}`}>{q.queueStatus}</span></td>
                  <td className="px-4 py-3 text-zinc-400">{q.queuePosition ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{q.assignedLogin ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{fmtDateTime(q.createdAt)}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{fmtDuration(q.durationSeconds)}</td>
                  <td className="px-4 py-3">
                    {q.queueStatus === "Waiting" && (
                      <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleRetry(q.challengeId)} disabled={busyId === q.challengeId || q.availableForSize === 0}
                          className="flex items-center gap-1 rounded-lg bg-[#D4AF37] px-2.5 py-1 text-xs font-semibold text-black hover:bg-[#F5D573] disabled:cursor-not-allowed disabled:opacity-30"
                          title={q.availableForSize === 0 ? "No inventory available yet" : undefined}>
                          <RotateCw className="h-3 w-3" strokeWidth={2} /> Retry
                        </button>
                        <button onClick={() => handleCancel(q.challengeId)} disabled={busyId === q.challengeId}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/5">
                          <XCircle className="h-3 w-3" strokeWidth={2} /> Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedId === q.challengeId && (
                  <tr key={`${q.challengeId}-detail`}><td colSpan={9} className="p-0"><DetailPanel challengeId={q.challengeId} /></td></tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
