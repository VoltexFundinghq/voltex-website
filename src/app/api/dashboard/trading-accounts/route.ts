import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyTradingAccounts } from "@/lib/database/customer-dashboard";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get("userId");
  if (requestedUserId !== user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const accounts = await getMyTradingAccounts(user.id);
  return NextResponse.json({ accounts });
}
