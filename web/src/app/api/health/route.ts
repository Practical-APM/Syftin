import { NextResponse } from "next/server";
import {
  getHealthSnapshot,
  toPublicHealth,
} from "@/lib/security/health";
import { safeEqualString } from "@/lib/security/timing-safe";

function isDetailedHealthAuthorized(request: Request): boolean {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return safeEqualString(auth.slice(7).trim(), secret);
  }

  const header = request.headers.get("x-health-secret");
  if (header && safeEqualString(header, secret)) return true;

  return false;
}

export async function GET(request: Request) {
  const detailed = isDetailedHealthAuthorized(request);
  const snapshot = await getHealthSnapshot(detailed);

  if (detailed) {
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(toPublicHealth(snapshot), {
    headers: { "Cache-Control": "no-store" },
  });
}
