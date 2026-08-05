import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Routes that require a logged-in user. The dashboard layout also
 * enforces this itself via requireUser() — this is a second,
 * earlier layer that can redirect before any rendering begins.
 */
const PROTECTED_ROUTES: string[] = ["/dashboard"];

// Real route-to-module mapping for admin WRITE-action (API)
// enforcement. Anything NOT listed here falls through to the
// fail-closed default below — genuinely unmapped paths require
// Super Admin, never silently allowed.
const API_ROUTE_MODULE_MAP: { prefix: string; module: string }[] = [
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
  { prefix: "/api/admin/support-tickets", module: "Support" },
];

// Real PAGE-to-module mapping for READ (page-view) enforcement.
// Ordered most-specific-first — "/admin" itself is checked via exact
// match only, never startsWith, so it can't accidentally swallow
// every other admin path.
const PAGE_MODULE_MAP: { prefix: string; module: string }[] = [
  { prefix: "/admin/users", module: "Traders" },
  { prefix: "/admin/purchases", module: "Traders" },
  { prefix: "/admin/traders", module: "Traders" },
  { prefix: "/admin/inventory", module: "Inventory" },
  { prefix: "/admin/system/personal-areas", module: "Inventory" },
  { prefix: "/admin/operations/provisioning-queue", module: "Provisioning Queue" },
  { prefix: "/admin/operations/vps-monitoring", module: "VPS Monitoring" },
  { prefix: "/admin/finance", module: "Finance" },
  { prefix: "/admin/risk", module: "Risk" },
  { prefix: "/admin/system/support", module: "Support" },
  { prefix: "/admin/system/email-queue", module: "Settings" },
  { prefix: "/admin/system/settings", module: "Settings" },
];

// Always Super Admin only, regardless of any stored module
// permission — hard-coded given how severe these two specific
// capabilities are (managing other admins; permanently deleting real
// account data). Covers both API routes and real page views.
const ALWAYS_SUPER_ADMIN_ONLY = ["/api/admin/admins", "/api/admin/delete-test-data", "/admin/system/admins"];
const LEVEL_RANK: Record<string, number> = { no_access: 0, read: 1, write: 2, full: 3 };

/**
 * Refreshes the Supabase auth session on every matching request.
 * Also enforces real, per-module admin permissions:
 *  - On /api/admin/* requests, blocks the WRITE action outright.
 *  - On /admin/* page views, REWRITES (not redirects) to
 *    /admin/access-denied — the URL bar stays on the page the admin
 *    actually clicked, and since /admin/access-denied is nested
 *    under the same /admin/layout.tsx, the real sidebar and header
 *    keep rendering normally; only the content area swaps.
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
  const isApiAdmin = path.startsWith("/api/admin/");
  const isAdminPage = path.startsWith("/admin") && path !== "/admin/access-denied";

  if (isApiAdmin || isAdminPage) {
    if (!user) {
      return isApiAdmin
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_admin, admin_role")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return isApiAdmin
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url));
    }

    if (profile.admin_role !== "super_admin") {
      const isAlwaysSuperAdminOnly = ALWAYS_SUPER_ADMIN_ONLY.some((p) => path.startsWith(p));

      if (isAlwaysSuperAdminOnly) {
        if (isApiAdmin) {
          return NextResponse.json({ error: "This action requires Super Admin." }, { status: 403 });
        }
        const deniedUrl = new URL("/admin/access-denied", request.url);
        deniedUrl.searchParams.set("module", "Admins");
        return NextResponse.rewrite(deniedUrl);
      }

      if (isApiAdmin) {
        const matched = API_ROUTE_MODULE_MAP.find((r) => path.startsWith(r.prefix));
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
      } else {
        // Real page view — determine the module. "/admin" itself
        // (bare dashboard) is checked by exact match; everything
        // else by longest-matching real prefix.
        const module = path === "/admin"
          ? "Dashboard"
          : PAGE_MODULE_MAP.find((r) => path.startsWith(r.prefix))?.module;

        if (!module) {
          const deniedUrl = new URL("/admin/access-denied", request.url);
          return NextResponse.rewrite(deniedUrl);
        }

        const { data: permission } = await supabase
          .from("admin_permissions")
          .select("permission_level")
          .eq("admin_user_id", user.id)
          .eq("module", module)
          .maybeSingle();

        const currentRank = LEVEL_RANK[permission?.permission_level ?? "no_access"] ?? 0;

        if (currentRank < LEVEL_RANK.read) {
          const deniedUrl = new URL("/admin/access-denied", request.url);
          deniedUrl.searchParams.set("module", module);
          return NextResponse.rewrite(deniedUrl);
        }
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
