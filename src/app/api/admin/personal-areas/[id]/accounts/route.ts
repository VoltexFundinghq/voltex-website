import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";
import { getPaAccounts } from "@/lib/database/admin-personal-areas";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();
  const paQuery = await serviceClient.from("personal_areas").select("label").eq("id", id).single();
  const pa = paQuery.data as { label: string } | null;
  if (!pa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const accounts = await getPaAccounts(pa.label);
  return NextResponse.json({ accounts });
}
