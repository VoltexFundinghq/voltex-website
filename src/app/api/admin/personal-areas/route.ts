import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { label, exnessEmail, exnessPassword, maxCapacity, notes } = body;
  if (!label) return NextResponse.json({ error: "PA name is required" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { error } = await (serviceClient.from("personal_areas") as any).insert({
    label,
    exness_email: exnessEmail || null,
    exness_password: exnessPassword || null,
    max_capacity: maxCapacity || 100,
    notes: notes || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
