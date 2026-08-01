import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const serviceClient = createServiceClient();

  const paQuery = await serviceClient.from("personal_areas").select("label").eq("id", id).single();
  const pa = paQuery.data as { label: string } | null;
  if (!pa) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const accountsQuery = await serviceClient.from("trading_accounts").select("id", { count: "exact", head: true }).eq("pa_label", pa.label);
  if ((accountsQuery.count ?? 0) > 0) {
    return NextResponse.json({ error: "Cannot delete a PA that still has accounts. Retire or reassign them first." }, { status: 409 });
  }

  const { error } = await serviceClient.from("personal_areas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });

  return NextResponse.json({ success: true });
}
