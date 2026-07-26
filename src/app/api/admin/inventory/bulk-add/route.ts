import { NextResponse } from "next/server";
import crypto from "crypto";
import { checkAdminForApi } from "@/lib/auth/api-admin-check";
import { createServiceClient } from "@/lib/supabase/service";

const SPECIAL = "#@$&*!?|,./^+_-";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";

function randomChar(set: string): string {
  return set[crypto.randomInt(set.length)];
}

// Matches the exact, already-proven rules from scripts/generate-passwords.js:
// 8-15 characters, guaranteed at least one upper/lower/digit/special,
// remaining characters filled randomly from the full combined set.
function generatePassword(): string {
  const length = 8 + crypto.randomInt(8); // 8-15 chars
  const required = [randomChar(UPPER), randomChar(LOWER), randomChar(DIGITS), randomChar(SPECIAL)];
  const allChars = UPPER + LOWER + DIGITS + SPECIAL;
  const remaining = Array.from({ length: length - 4 }, () => randomChar(allChars));
  const combined = [...required, ...remaining];
  // Shuffle so required chars aren't always in the same position
  for (let i = combined.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join("");
}

interface InputRow {
  login: string;
  accountSize: number;
  server: string;
}

export async function POST(request: Request) {
  const admin = await checkAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const rows = body.accounts as InputRow[];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No accounts provided" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const results: { login: string; password: string; investorPassword: string; server: string; accountSize: number }[] = [];
  const errors: { login: string; reason: string }[] = [];

  for (const row of rows) {
    if (!row.login || !row.accountSize || !row.server) {
      errors.push({ login: row.login ?? "(missing)", reason: "Missing login, size, or server" });
      continue;
    }

    const password = generatePassword();
    const investorPassword = generatePassword();

    const { error } = await (serviceClient.from("trading_accounts") as any).insert({
      login: row.login,
      account_size: row.accountSize,
      server: row.server,
      broker: "Exness", // defaulted — every account in this system is Exness
      password,
      investor_password: investorPassword,
      status: "available",
    });

    if (error) {
      errors.push({ login: row.login, reason: error.message });
    } else {
      results.push({ login: row.login, password, investorPassword, server: row.server, accountSize: row.accountSize });
    }
  }

  return NextResponse.json({ created: results, errors });
}
