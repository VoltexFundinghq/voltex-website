import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { getPassedTraderDetail } from "@/lib/database/admin-passed-traders";
import { sendFundedAccountEmail } from "@/lib/services/email/templates";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const detail = await getPassedTraderDetail(id);
  if (!detail || !detail.fundedAccount?.login) {
    return NextResponse.json({ error: "No funded account to send credentials for" }, { status: 404 });
  }

  const serviceClient = createServiceClient();
  const accountQuery = await serviceClient
    .from("trading_accounts")
    .select("account_size, login, password, server, broker")
    .eq("login", detail.fundedAccount.login)
    .single();

  const account = accountQuery.data as any;
  if (!account) return NextResponse.json({ error: "Account details not found" }, { status: 404 });

  await sendFundedAccountEmail(detail.customer.email, {
    accountSize: `₦${Number(account.account_size).toLocaleString()}`,
    login: account.login,
    password: account.password,
    server: account.server,
    broker: account.broker,
  });

  return NextResponse.json({ success: true });
}
