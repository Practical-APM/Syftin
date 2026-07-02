import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

declare global {
  var __syftinRateLimitBuckets: Map<string, Bucket> | undefined;
}

const buckets = global.__syftinRateLimitBuckets ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") {
  global.__syftinRateLimitBuckets = buckets;
}

export type RateLimitConfig = {
  /** Max requests per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
};

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number };

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;

  if (url && token && url.startsWith("http")) {
    try {
       const res = await fetch(`${url}/incr/${key}`, {
         headers: { Authorization: `Bearer ${token}` }
       });
       if (res.ok) {
          const data = await res.json();
          const count = Number(data.result);
          if (count === 1) {
             await fetch(`${url}/pexpire/${key}/${config.windowMs}`, {
                headers: { Authorization: `Bearer ${token}` }
             });
          }
          const now = Date.now();
          if (count > config.limit) {
            return { ok: false, remaining: 0, resetAt: now + config.windowMs };
          }
          return { ok: true, remaining: config.limit - count, resetAt: now + config.windowMs };
       }
    } catch (err) {
       console.error("Upstash Redis error, falling back to memory:", err);
    }
  }

  // Fallback to in-memory
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + config.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: config.limit - 1, resetAt };
  }

  if (existing.count >= config.limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    ok: true,
    remaining: config.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

export function rateLimitKey(scope: string, id: string): string {
  return `${scope}:${id}`;
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

/** Pilot-scale in-memory limiter. Use Redis / Upstash for multi-region production. */
export const RATE_LIMITS = {
  waitlist: { limit: 5, windowMs: 60_000 },
  nodeAuth: { limit: 60, windowMs: 60_000 },
  nodeClaim: { limit: 120, windowMs: 60_000 },
  nodeComplete: { limit: 30, windowMs: 60_000 },
  jobCreate: { limit: 30, windowMs: 3_600_000 },
  paymentsOrder: { limit: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>;
