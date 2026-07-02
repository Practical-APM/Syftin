import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@vercel/kv";
import { isSupabaseConfigured } from "@/lib/env";

const RATE_LIMIT_WINDOW_SEC = 60;
const RATE_LIMIT_MAX_REQUESTS = 120; // 120 requests per minute per org

// Only initialize KV if env vars exist (used for actual ratelimiting)
const kv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? createClient({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

/**
 * Applies basic rate-limiting for v2 API routes per organization ID.
 * Falls back to mock headers if KV is not configured.
 */
export async function withRateLimit(
  orgId: string,
  handler: () => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  const reqHeaders = await headers();
  const ip = reqHeaders.get("x-forwarded-for") ?? "127.0.0.1";
  
  if (!kv || !isSupabaseConfigured()) {
    // If not in prod/configured, just execute and add dummy headers
    const res = await handler();
    res.headers.set("X-RateLimit-Limit", RATE_LIMIT_MAX_REQUESTS.toString());
    res.headers.set("X-RateLimit-Remaining", (RATE_LIMIT_MAX_REQUESTS - 1).toString());
    res.headers.set("X-RateLimit-Reset", (Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW_SEC).toString());
    return res;
  }

  const key = `ratelimit:v2:${orgId}:${ip}`;
  
  try {
    const multi = kv.multi();
    multi.incr(key);
    multi.expire(key, RATE_LIMIT_WINDOW_SEC);
    const results = await multi.exec();
    
    const count = (results[0] as number) || 1;
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - count);
    const reset = Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW_SEC;

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { 
          status: 429,
          headers: {
            "X-RateLimit-Limit": RATE_LIMIT_MAX_REQUESTS.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": RATE_LIMIT_WINDOW_SEC.toString(),
          }
        }
      );
    }

    const res = await handler();
    res.headers.set("X-RateLimit-Limit", RATE_LIMIT_MAX_REQUESTS.toString());
    res.headers.set("X-RateLimit-Remaining", remaining.toString());
    res.headers.set("X-RateLimit-Reset", reset.toString());
    return res;
  } catch (err) {
    console.warn("Rate limit check failed, allowing request:", err);
    return handler();
  }
}
