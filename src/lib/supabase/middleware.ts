import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES: string[] = ["/dashboard"];

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

const ALWAYS_SUPER_ADMIN_ONLY = ["/api/admin/admins", "/api/admin/delete-test-data", "/admin/system/admins"];
const LEVEL_RANK: Record<string, number> = { no_access: 0, read: 1, write: 2, full: 3 };

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

  // Service-role client — used ONLY for reading permission data,
  // bypassing RLS. The cookie-based client above stays responsible
  // for identity (who is this request from), matching the pattern
  // used correctly everywhere else in this project.
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    const { data: profile } = await serviceClient
      .from("users")
      .select("is_admin, admin_role, is_suspended")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return isApiAdmin
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : NextResponse.redirect(new URL("/login", request.url));
    }

    if (profile.is_suspended) {
      await supabase.auth.signOut();
      return isApiAdmin
        ? NextResponse.json({ error: "Account suspended." }, { status: 403 })
        : NextResponse.redirect(new URL("/login?error=Your admin account has been suspended.", request.url));
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

        const { data: permission } = await serviceClient
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
        const module = path === "/admin"
          ? "Dashboard"
          : PAGE_MODULE_MAP.find((r) => path.startsWith(r.prefix))?.module;

        if (!module) {
          const deniedUrl = new URL("/admin/access-denied", request.url);
          return NextResponse.rewrite(deniedUrl);
        }

        const { data: permission } = await serviceClient
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
