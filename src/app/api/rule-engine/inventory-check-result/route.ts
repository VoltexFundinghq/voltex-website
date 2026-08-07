import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const secret = request.headers.get("x-vps-secret");
  if (!secret || secret !== process.env.VPS_SCRIPT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { accountId, login, paLabel, alive } = body;
  if (!accountId || alive === undefined) {
    return NextResponse.json({ error: "accountId and alive are required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  if (alive) {
    const { error } = await (serviceClient.from("trading_accounts") as any)
      .update({ last_verified_alive_at: new Date().toISOString() })
      .eq("id", accountId);

    if (error) {
      console.error(`Failed to update last_verified_alive_at for ${login}:`, error);
      return NextResponse.json({ error: "Database update failed", details: error.message }, { status: 500 });
    }
    return NextResponse.json({ status: "ok" });
  }

  const { data: inserted, error } = await (serviceClient.from("manual_reviews") as any)
    .insert({
      source_type: "inventory_health",
      source_id: accountId,
      user_id: null,
      category: "Inventory",
      priority: "medium",
      status: "open",
      reason: "Account failed two consecutive login attempts",
      description: `MT5 login ${login} (PA: ${paLabel ?? "unknown"}) failed to authenticate twice, roughly 5 minutes apart — likely deleted by Exness. Please confirm and mark deleted, then provision a replacement.`,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create inventory health manual review:", error);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  if (inserted) {
    await (serviceClient.from("manual_review_events") as any).insert({
      review_id: inserted.id, event_type: "Review Created", note: "Auto-detected by daily inventory health check",
    });
  }

  return NextResponse.json({ status: "flagged" });
}
