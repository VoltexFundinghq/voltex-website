import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const secret = request.headers.get("x-vps-secret");
  if (!secret || secret !== process.env.VPS_SCRIPT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const query = await serviceClient
    .from("trading_accounts")
    .select("id, login, investor_password, server, pa_label")
    .eq("status", "available");

  const accounts = ((query.data ?? []) as unknown as any[]).map((a) => ({
    id: a.id,
    login: a.login,
    investorPassword: a.investor_password,
    server: a.server,
    paLabel: a.pa_label,
  }));

  return NextResponse.json({ accounts });
}
