import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { login, server, accountSize, paLabel, password, investorPassword } = body;

  if (!login || !server || !accountSize || !password || !investorPassword) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("trading_accounts") as any).insert({
    login,
    server,
    account_size: accountSize,
    pa_label: paLabel || null,
    broker: "Exness",
    password,
    investor_password: investorPassword,
    status: "available",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
