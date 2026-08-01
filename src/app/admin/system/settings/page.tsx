import { getSystemOverview } from "@/lib/database/admin-settings";
import AdminHeader from "@/components/admin/AdminHeader";
import SettingsPanel from "@/components/admin/SettingsPanel";
import { Activity, Server, Wifi, Mail, Building2 } from "lucide-react";

function StatusCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: any; tone?: "success" | "danger" | "gold" }) {
  const toneClass = tone === "success" ? "text-emerald-400" : tone === "danger" ? "text-red-400" : tone === "gold" ? "text-[#D4AF37]" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
        <Icon className="h-4 w-4 text-zinc-600" strokeWidth={1.75} />
      </div>
      <p className={`mt-2 text-lg font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export default async function SettingsPage() {
  const overview = await getSystemOverview();

  return (
    <div>
      <AdminHeader title="Settings" />
      <div className="space-y-6 p-4 sm:p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatusCard label="Platform Status" value={overview.platformMode === "live" ? "Online" : overview.platformMode === "maintenance" ? "Maintenance" : "Read Only"} icon={Activity} tone={overview.platformMode === "live" ? "success" : "danger"} />
          <StatusCard label="Provisioning Service" value={overview.provisioningServiceRunning ? "Running" : "Not Reporting"} icon={Server} tone={overview.provisioningServiceRunning ? "success" : "danger"} />
          <StatusCard label="VPS Monitoring" value={overview.vpsMonitoringHealthy ? "Healthy" : "Not Reporting"} icon={Wifi} tone={overview.vpsMonitoringHealthy ? "success" : "danger"} />
          <StatusCard label="Email Service" value="Active (Resend)" icon={Mail} tone="success" />
          <StatusCard label="Active Personal Areas" value={String(overview.activePersonalAreas)} icon={Building2} tone="gold" />
        </div>

        <SettingsPanel initialPlatformMode={overview.platformMode} />
      </div>
    </div>
  );
}
