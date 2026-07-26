import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";

const SPECIAL = "#@$&*!?|,./^+_-";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

function randomChar(set: string): string {
  return set[crypto.randomInt(set.length)];
}

function generatePassword(): string {
  const length = 8 + crypto.randomInt(8);
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SPECIAL)];
  const allChars = UPPER + LOWER + DIGITS + SPECIAL;
  const remaining = Array.from({ length: length - 4 }, () => randomChar(allChars));
  const combined = [...required, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

// Generates password pairs ONLY — no database write happens here.
// Rows only become real once saved via /save-account, after the
// admin has actually created the demo account on Exness.
export async function POST(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const count = Math.min(Math.max(Number(body.count) || 10, 1), 50);

  const rows = Array.from({ length: count }, () => ({
    password: generatePassword(),
    investorPassword: generatePassword(),
  }));

  return NextResponse.json({ rows });
}
