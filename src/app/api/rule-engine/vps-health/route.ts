import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const body = await request.json();
  const { machineLabel, cpuPercent, ramPercent, diskPercent } = body;

  if (!machineLabel) {
    return NextResponse.json({ error: "machineLabel is required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { error } = await (serviceClient.from("vps_machines") as any)
    .upsert(
      {
        label: machineLabel,
        cpu_percent: cpuPercent,
        ram_percent: ramPercent,
        disk_percent: diskPercent,
        last_reported_at: new Date().toISOString(),
      },
      { onConflict: "label" }
    );

  if (error) {
    console.error("VPS health upsert failed:", error);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
