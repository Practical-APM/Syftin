import { headers } from "next/headers";

/** Best-effort client IP behind Vercel / reverse proxies. */
export function getClientIpFromHeaders(headerStore: Headers): string {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headerStore.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export async function getClientIp(): Promise<string> {
  const headerStore = await headers();
  return getClientIpFromHeaders(headerStore);
}

export function getClientIpFromRequest(request: Request): string {
  return getClientIpFromHeaders(request.headers);
}
