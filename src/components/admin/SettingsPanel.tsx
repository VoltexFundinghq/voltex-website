"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle2, XCircle, Loader2, Download, Mail, AlertTriangle } from "lucide-react";

type SaveState = "idle" | "saving" | "saved" | "failed";

function SaveButton({ state, onClick }: { state: SaveState; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={state === "saving"} className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#F5D573] disabled:opacity-50">
      {state === "saving" ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</> :
       state === "saved" ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</> :
       state === "failed" ? <><XCircle className="h-3.5 w-3.5" /> Failed</> :
       <><Save className="h-3.5 w-3.5" /> Save Changes</>}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" />
    </div>
  );
}

export default function SettingsPanel({ initialPlatformMode }: { initialPlatformMode: string }) {
  const [general, setGeneral] = useState<Record<string, string>>({});
  const [generalState, setGeneralState] = useState<SaveState>("idle");

  const [platformMode, setPlatformMode] = useState(initialPlatformMode);
  const [modeState, setModeState] = useState<SaveState>("idle");

  const [ruleToggles, setRuleToggles] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [challengeState, setChallengeState] = useState<SaveState>("idle");

  const [inventory, setInventory] = useState<Record<string, string>>({});
  const [inventoryState, setInventoryState] = useState<SaveState>("idle");

  const [testEmailState, setTestEmailState] = useState<SaveState>("idle");

  useEffect(() => {
    const keys = ["platform_name", "support_email", "company_email", "support_phone", "business_address", "default_timezone", "default_currency",
      "weekend_holding_rule_enabled", "news_trading_rule_enabled", "copy_trading_detection_enabled",
      "default_profit_target", "default_drawdown_limit", "default_profit_split",
      "low_inventory_threshold", "critical_inventory_threshold"];
    fetch(`/api/admin/settings?keys=${keys.join(",")}`).then((r) => r.json()).then((data) => {
      const s = data.settings;
      setGeneral({ platform_name: s.platform_name ?? "", support_email: s.support_email ?? "", company_email: s.company_email ?? "", support_phone: s.support_phone ?? "", business_address: s.business_address ?? "", default_timezone: s.default_timezone ?? "", default_currency: s.default_currency ?? "" });
      setRuleToggles({ weekend_holding_rule_enabled: s.weekend_holding_rule_enabled ?? "true", news_trading_rule_enabled: s.news_trading_rule_enabled ?? "true", copy_trading_detection_enabled: s.copy_trading_detection_enabled ?? "true" });
      setDefaults({ default_profit_target: s.default_profit_target ?? "10", default_drawdown_limit: s.default_drawdown_limit ?? "20", default_profit_split: s.default_profit_split ?? "80" });
      setInventory({ low_inventory_threshold: s.low_inventory_threshold ?? "3", critical_inventory_threshold: s.critical_inventory_threshold ?? "0" });
    });
  }, []);

  async function save(updates: Record<string, string>, setState: (s: SaveState) => void) {
    setState("saving");
    try {
      const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updates }) });
      setState(res.ok ? "saved" : "failed");
    } catch { setState("failed"); }
    setTimeout(() => setState("idle"), 2000);
  }

  async function handleTestEmail() {
    setTestEmailState("saving");
    try {
      const res = await fetch("/api/admin/settings/test-email", { method: "POST" });
      setTestEmailState(res.ok ? "saved" : "failed");
    } catch { setTestEmailState("failed"); }
    setTimeout(() => setTestEmailState("idle"), 2500);
  }

  return (
    <div className="space-y-6">
      <Section title="General Settings">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Platform Name" value={general.platform_name ?? ""} onChange={(v) => setGeneral({ ...general, platform_name: v })} />
          <TextField label="Support Email" value={general.support_email ?? ""} onChange={(v) => setGeneral({ ...general, support_email: v })} />
          <TextField label="Company Email" value={general.company_email ?? ""} onChange={(v) => setGeneral({ ...general, company_email: v })} />
          <TextField label="Support Phone" value={general.support_phone ?? ""} onChange={(v) => setGeneral({ ...general, support_phone: v })} />
          <TextField label="Business Address" value={general.business_address ?? ""} onChange={(v) => setGeneral({ ...general, business_address: v })} />
          <TextField label="Default Timezone" value={general.default_timezone ?? ""} onChange={(v) => setGeneral({ ...general, default_timezone: v })} />
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">Default Currency (₦/NGN) and Language (English) aren't configurable — the entire platform is built single-currency and English-only, with no multi-currency or localization system.</p>
        <SaveButton state={generalState} onClick={() => save(general, setGeneralState)} />
      </Section>

      <Section title="Platform Mode">
        <p className="mb-3 text-xs text-zinc-500">This genuinely controls the platform — Maintenance and Read Only both actively block new purchases at checkout, not just a label.</p>
        <div className="flex flex-wrap gap-2">
          {["live", "maintenance", "read_only"].map((mode) => (
            <button key={mode} onClick={() => setPlatformMode(mode)} className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${platformMode === mode ? "bg-[#D4AF37] text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>
        {platformMode !== "live" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/5 p-3 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" /> New purchases will be blocked platform-wide the moment you save this. Existing active trading is unaffected.
          </div>
        )}
        <SaveButton state={modeState} onClick={() => save({ platform_mode: platformMode }, setModeState)} />
      </Section>

      <Section title="Challenge Settings">
        <p className="mb-3 text-xs text-zinc-500">Defaults below apply to new challenges created through the normal purchase flow. Two separate admin tools (the reconciliation script and manual "Retry Provisioning") still use their own hardcoded values independently — worth aligning in a future pass if this becomes a real inconsistency.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="mb-1 block text-xs text-zinc-500">Default Profit Target (%)</label><input type="number" value={defaults.default_profit_target ?? ""} onChange={(e) => setDefaults({ ...defaults, default_profit_target: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs text-zinc-500">Default Overall Drawdown (%)</label><input type="number" value={defaults.default_drawdown_limit ?? ""} onChange={(e) => setDefaults({ ...defaults, default_drawdown_limit: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs text-zinc-500">Default Profit Split (%)</label><input type="number" value={defaults.default_profit_split ?? ""} onChange={(e) => setDefaults({ ...defaults, default_profit_split: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" /></div>
        </div>

        <div className="mt-4 space-y-2">
          {[
            { key: "weekend_holding_rule_enabled", label: "Weekend Holding Rule" },
            { key: "news_trading_rule_enabled", label: "News Trading Rule" },
            { key: "copy_trading_detection_enabled", label: "Copy Trading Detection" },
          ].map((rule) => (
            <div key={rule.key} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
              <span className="text-sm text-zinc-300">{rule.label}</span>
              <button onClick={() => setRuleToggles({ ...ruleToggles, [rule.key]: ruleToggles[rule.key] === "true" ? "false" : "true" })}
                className={`rounded-full px-3 py-1 text-xs font-medium ${ruleToggles[rule.key] === "true" ? "bg-emerald-400/10 text-emerald-400" : "bg-white/5 text-zinc-500"}`}>
                {ruleToggles[rule.key] === "true" ? "Enabled" : "Disabled"}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-zinc-600">These genuinely control the live rule engine — disabling a rule here means it stops being enforced on every check, immediately.</p>
        <SaveButton state={challengeState} onClick={() => save({ ...defaults, ...ruleToggles }, setChallengeState)} />
      </Section>

      <Section title="Inventory Settings">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-1 block text-xs text-zinc-500">Low Inventory Warning (accounts)</label><input type="number" value={inventory.low_inventory_threshold ?? ""} onChange={(e) => setInventory({ ...inventory, low_inventory_threshold: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs text-zinc-500">Critical Inventory Warning (accounts)</label><input type="number" value={inventory.critical_inventory_threshold ?? ""} onChange={(e) => setInventory({ ...inventory, critical_inventory_threshold: e.target.value })} className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-200 focus:border-[#D4AF37]/40 focus:outline-none" /></div>
        </div>
        <p className="mt-3 text-[11px] text-zinc-600">The 21-day auto-retirement delay isn't listed here — that's Exness's own policy, not something we control or set. Automatic PA Selection is always on; there's no manual-assignment mode to disable it in favor of.</p>
        <SaveButton state={inventoryState} onClick={() => save(inventory, setInventoryState)} />
      </Section>

      <Section title="Email">
        <p className="mb-3 text-xs text-zinc-500">We send via Resend's API, not SMTP directly. There's no separate "queue" — every email sends synchronously the moment its triggering event happens.</p>
        <button onClick={handleTestEmail} disabled={testEmailState === "saving"} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
          <Mail className="h-3.5 w-3.5" />
          {testEmailState === "saving" ? "Sending..." : testEmailState === "saved" ? "Sent — check your inbox" : testEmailState === "failed" ? "Failed to send" : "Send Test Email To Myself"}
        </button>
      </Section>

      <Section title="Data Export">
        <p className="mb-3 text-xs text-zinc-500">A genuine, safe, read-only export of real operational data — not a full database backup/restore system, which we don't have and won't fake given how dangerous a non-functional "Restore" button would be.</p>
        <a href="/api/admin/settings/export" download className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
          <Download className="h-3.5 w-3.5" /> Export Database (JSON)
        </a>
      </Section>

      <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-6">
        <h2 className="mb-2 text-lg font-semibold text-red-400">Danger Zone</h2>
        <p className="text-xs text-zinc-500">Restart buttons for the provisioning engine, VPS monitor, or email queue aren't included here — there's no command channel from our web backend to the VPS, so a button here couldn't genuinely do anything. Restoring from backup and deleting test data both need their own careful, separate build — not bundled into this page given the real risk of getting either wrong.</p>
      </div>
    </div>
  );
}
