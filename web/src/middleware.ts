import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeAuthNext } from "@/lib/auth/normalize-next";
import { applySecurityHeaders } from "@/lib/security/headers";
import { isAuthRequired, isSupabaseClientConfigured } from "@/lib/env";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/privacy",
  "/terms",
  "/dpa",
  "/docs",
  "/robots.txt",
  "/sitemap.xml",
];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/docs")) return true;
  if (pathname === "/api/health") return true;
  if (pathname === "/api/waitlist") return true;
  if (pathname.startsWith("/api/node/")) return true;
  if (pathname.startsWith("/api/v1/")) return true;
  if (pathname.startsWith("/api/internal/")) return true;
  if (pathname === "/api/payments/razorpay/webhook") return true;
  if (pathname === "/api/payments/razorpayx/webhook") return true;
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/releases/")) return true;
  if (pathname.startsWith("/installers/")) return true;
  if (pathname === "/install-node.sh") return true;
  if (pathname === "/install-node.ps1") return true;
  if (pathname === "/install-playwright.sh") return true;
  return false;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseClientConfigured()) {
    return applySecurityHeaders(response);
  }

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
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (
    user &&
    pathname === "/login" &&
    request.nextUrl.searchParams.get("next")?.startsWith("/contributor")
  ) {
    const dest = normalizeAuthNext(request.nextUrl.searchParams.get("next"));
    if (dest) {
      return applySecurityHeaders(NextResponse.redirect(new URL(dest, request.url)));
    }
  }

  if (isAuthRequired() && !user && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(response);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/contributor/:path*",
    "/api/:path*",
    "/login",
  ],
};
