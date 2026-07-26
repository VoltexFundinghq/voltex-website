import { getVpsStats, getVpsMonitoringData } from "@/lib/database/admin-vps-monitoring";
import AdminHeader from "@/components/admin/AdminHeader";
import { Wifi, WifiOff, Cpu, MemoryStick, HardDrive } from "lucide-react";

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-emerald-400" : tone === "danger" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-600" strokeWidth={1.75} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function machineHealthBadge(level: string) {
  if (level === "healthy") return { label: "Healthy", className: "bg-emerald-400/10 text-emerald-400" };
  if (level === "warning") return { label: "Warning", className: "bg-amber-400/10 text-amber-400" };
  if (level === "critical") return { label: "Critical", className: "bg-red-400/10 text-red-400" };
  return { label: "Unknown (stale report)", className: "bg-white/5 text-zinc-500" };
}

function slotStatusBadge(status: string) {
  if (status === "healthy") return { label: "Healthy", className: "bg-emerald-400/10 text-emerald-400" };
  if (status === "delayed") return { label: "Delayed", className: "bg-amber-400/10 text-amber-400" };
  if (status === "offline") return { label: "Offline", className: "bg-red-400/10 text-red-400" };
  return { label: "Idle", className: "bg-white/5 text-zinc-500" };
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export default async function VPSMonitoringPage() {
  const [stats, data] = await Promise.all([getVpsStats(), getVpsMonitoringData()]);

  return (
    <div>
      <AdminHeader title="VPS Monitoring" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Online Slots" value={String(stats.onlineSlots)} icon={Wifi} tone="success" />
          <StatCard label="Offline Slots" value={String(stats.offlineSlots)} icon={WifiOff} tone={stats.offlineSlots > 0 ? "danger" : undefined} />
          <StatCard label="Avg CPU" value={`${stats.avgCpuPercent}%`} icon={Cpu} />
          <StatCard label="Avg RAM" value={`${stats.avgRamPercent}%`} icon={MemoryStick} />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white">Machines</h2>
          <p className="mt-1 text-xs text-zinc-500">Real CPU/RAM/Disk reported directly by each VPS every 30 seconds — heartbeat interval: 10s.</p>
          {data.machines.length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-600">No machines have reported in yet.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.machines.map((m) => {
                const badge = machineHealthBadge(m.healthLevel);
                return (
                  <div key={m.label} className="rounded-lg border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm text-zinc-300">{m.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>CPU</span><span>{m.cpuPercent ?? "—"}%</span></div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${m.cpuPercent ?? 0}%` }} /></div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>RAM</span><span>{m.ramPercent ?? "—"}%</span></div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${m.ramPercent ?? 0}%` }} /></div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Disk</span><span>{m.diskPercent ?? "—"}%</span></div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${m.diskPercent ?? 0}%` }} /></div>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-zinc-600">Last reported: {timeAgo(m.lastReportedAt)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Terminal Slots</h2>
            <span className="text-xs text-zinc-500">Monitoring Coverage: <span className="font-mono text-emerald-400">{data.coveragePercent}%</span></span>
          </div>
          {data.slots.length === 0 ? (
            <p className="mt-6 text-center text-sm text-zinc-600">No slots registered yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-3 py-2 font-medium">Slot</th>
                    <th className="px-3 py-2 font-medium">Machine</th>
                    <th className="px-3 py-2 font-medium">MT5 Login</th>
                    <th className="px-3 py-2 font-medium">Trader</th>
                    <th className="px-3 py-2 font-medium">Stage</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slots.map((s) => {
                    const badge = slotStatusBadge(s.status);
                    return (
                      <tr key={s.slotLabel} className="border-b border-white/5">
                        <td className="px-3 py-2 font-mono text-zinc-300">{s.slotLabel}</td>
                        <td className="px-3 py-2 text-zinc-400">{s.machineLabel ?? "—"}</td>
                        <td className="px-3 py-2 font-mono text-xs text-zinc-500">{s.accountLogin ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-400">{s.traderName ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-400">{s.challengeStage ?? "—"}</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span></td>
                        <td className="px-3 py-2 text-xs text-zinc-500">{timeAgo(s.lastHeartbeat)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
