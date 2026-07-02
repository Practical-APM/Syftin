import type { NextResponse } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "on",
};

const PRODUCTION_HEADERS: Record<string, string> = {
  ...SECURITY_HEADERS,
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

export function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers =
    process.env.NODE_ENV === "production"
      ? PRODUCTION_HEADERS
      : SECURITY_HEADERS;

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const staticSecurityHeaders = Object.entries(
  process.env.NODE_ENV === "production" ? PRODUCTION_HEADERS : SECURITY_HEADERS,
).map(([key, value]) => ({ key, value }));
