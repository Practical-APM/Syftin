import { NextResponse } from "next/server";
import {
  recordDomainValidationEvent,
} from "@/lib/data/domain-circuit-breaker";
import { safeEqualString } from "@/lib/security/timing-safe";

function authorizeInternal(request: Request): boolean {
  const secret = process.env.INTERNAL_DELIVERY_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return safeEqualString(auth.slice(7).trim(), secret);
  }
  return false;
}

export async function POST(request: Request) {
  if (!authorizeInternal(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const domain = (body as { domain?: string }).domain;
  const passed = Boolean((body as { passed?: boolean }).passed);
  const nodeId = (body as { nodeId?: string }).nodeId ?? null;
  const jobId = (body as { jobId?: string }).jobId ?? null;
  const complianceScore = (body as { complianceScore?: number }).complianceScore;

  if (!domain) {
    return NextResponse.json({ error: "domain required." }, { status: 400 });
  }

  const result = await recordDomainValidationEvent({
    domain,
    nodeId,
    jobId,
    passed,
    complianceScore,
  });

  return NextResponse.json(result);
}
