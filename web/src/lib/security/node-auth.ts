import { NextResponse } from "next/server";
import { verifyNodeToken } from "@/lib/data/contributors";
import { getClientIpFromRequest } from "@/lib/security/client-ip";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token || null;
}

type NodeAuthResult =
  | { ok: true; nodeId: string; contributorId: string }
  | { ok: false; response: NextResponse };

export async function requireNodeAuth(
  request: Request,
  scope: keyof Pick<
    typeof RATE_LIMITS,
    "nodeAuth" | "nodeClaim" | "nodeComplete"
  >,
): Promise<NodeAuthResult> {
  const ip = getClientIpFromRequest(request);
  const ipLimit = await checkRateLimit(
    rateLimitKey(`node-ip:${scope}`, ip),
    RATE_LIMITS[scope],
  );
  if (!ipLimit.ok) {
    return { ok: false, response: rateLimitResponse(ipLimit.resetAt) };
  }

  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing Bearer token." },
        { status: 401 },
      ),
    };
  }

  const node = await verifyNodeToken(token);
  if (!node) {
    const authLimit = await checkRateLimit(
      rateLimitKey("node-auth-fail", ip),
      RATE_LIMITS.nodeAuth,
    );
    if (!authLimit.ok) {
      return { ok: false, response: rateLimitResponse(authLimit.resetAt) };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid node token." },
        { status: 401 },
      ),
    };
  }

  return { ok: true, nodeId: node.nodeId, contributorId: node.contributorId };
}

export const MAX_NODE_HTML_BYTES = 2_000_000;

export function rejectOversizedBody(request: Request): NextResponse | null {
  const length = request.headers.get("content-length");
  if (!length) return null;
  const bytes = Number.parseInt(length, 10);
  if (Number.isFinite(bytes) && bytes > MAX_NODE_HTML_BYTES) {
    return NextResponse.json(
      { error: "Request body too large." },
      { status: 413 },
    );
  }
  return null;
}
