import { NextResponse } from "next/server";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { getSettingsByKeys, updateSettings } from "@/lib/database/admin-settings";

export async function GET(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keys = searchParams.get("keys")?.split(",") ?? [];
  const settings = await getSettingsByKeys(keys);
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updates = body.updates as Record<string, string>;
  if (!updates || typeof updates !== "object") return NextResponse.json({ error: "Invalid updates" }, { status: 400 });

  await updateSettings(updates, admin.id);
  return NextResponse.json({ success: true });
}
