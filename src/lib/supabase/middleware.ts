import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes that require a logged-in user. The dashboard layout also
 * enforces this itself via requireUser() — this is a second,
 * earlier layer that can redirect before any rendering begins.
 */
const PROTECTED_ROUTES: string[] = ["/dashboard"];

// Real route-to-module mapping for admin permission enforcement.
// Anything NOT listed here falls through to the fail-closed default
// below — genuinely unmapped paths require Super Admin, never
// silently allowed.
const ROUTE_MODULE_MAP: { prefix: string; module: string }[] = [
  { prefix: "/api/admin/users", module: "Traders" },
  { prefix: "/api/admin/purchases", module: "Traders" },
  { prefix: "/api/admin/active-traders", module: "Traders" },
  { prefix: "/api/admin/passed-traders", module: "Traders" },
  { prefix: "/api/admin/failed-traders", module: "Traders" },
  { prefix: "/api/admin/funded-traders", module: "Traders" },
  { prefix: "/api/admin/inventory", module: "Inventory" },
  { prefix: "/api/admin/personal-areas", module: "Inventory" },
  { prefix: "/api/admin/provisioning-queue", module: "Provisioning Queue" },
  { prefix: "/api/admin/manual-reviews", module: "Risk" },
  { prefix: "/api/admin/rule-violations", module: "Risk" },
  { prefix: "/api/admin/audit-logs", module: "Risk" },
  { prefix: "/api/admin/payments", module: "Finance" },
  { prefix: "/api/admin/revenue", module: "Finance" },
  { prefix: "/api/admin/transactions", module: "Finance" },
  { prefix: "/api/admin/payout-requests", module: "Finance" },
  { prefix: "/api/admin/settings", module: "Settings" },
  { prefix: "/api/admin/email-queue", module: "Settings" },
];

// Always Super Admin only, regardless of any stored module
// permission — hard-coded given how severe these two specific
// capabilities are (managing other admins; permanently deleting real
// account data).
const ALWAYS_SUPER_ADMIN_ONLY = ["/api/admin/admins", "/api/admin/delete-test-data"];
const LEVEL_RANK: Record<string, number> = { no_access: 0, read: 1, write: 2, full: 3 };

/**
 * Refreshes the Supabase auth session on every matching request, and
 * redirects unauthenticated users away from protected routes.
 * Also enforces real, per-module admin permissions on every
 * /api/admin/* request — the single, fail-closed enforcement point
 * for the whole admin panel.
 * Called from the root proxy.ts.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path.startsWith("/api/admin/")) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin, admin_role")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.admin_role !== "super_admin") {
      if (ALWAYS_SUPER_ADMIN_ONLY.some((p) => path.startsWith(p))) {
        return NextResponse.json({ error: "This action requires Super Admin." }, { status: 403 });
      }

      const matched = ROUTE_MODULE_MAP.find((r) => path.startsWith(r.prefix));
      if (!matched) {
        return NextResponse.json({ error: "Access denied for this route." }, { status: 403 });
      }

      const { data: permission } = await supabase
        .from("admin_permissions")
        .select("permission_level")
        .eq("admin_user_id", user.id)
        .eq("module", matched.module)
        .maybeSingle();

      const currentRank = LEVEL_RANK[permission?.permission_level ?? "no_access"] ?? 0;
      const requiredRank = request.method === "GET" ? LEVEL_RANK.read : LEVEL_RANK.write;

      if (currentRank < requiredRank) {
        return NextResponse.json({ error: `Insufficient permission for ${matched.module}.` }, { status: 403 });
      }
    }
  }

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
