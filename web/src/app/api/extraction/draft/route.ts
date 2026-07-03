import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { generateExtractionDraft, isDraftAIConfigured } from "@/lib/ai/provider";
import { getEffectiveDomainsForOrg } from "@/lib/data/org-domains";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = await checkRateLimit(
    rateLimitKey("jobCreate", auth.org.orgId),
    { limit: 10, windowMs: RATE_LIMITS.jobCreate.windowMs },
  );
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  try {
    const body = await request.json();
    const requirements = String(body.requirements ?? "").trim();
    const mode = body.mode === "batch" ? "batch" : "single";

    if (requirements.length < 10) {
      return NextResponse.json(
        { error: "Describe what you need in at least a sentence or two." },
        { status: 400 },
      );
    }
    if (requirements.length > 4000) {
      return NextResponse.json(
        { error: "Description is too long. Keep it under 4000 characters." },
        { status: 400 },
      );
    }

    const allowedDomains = await getEffectiveDomainsForOrg(auth.org.orgId);
    const draft = await generateExtractionDraft({
      requirements,
      mode,
      allowed_domains: allowedDomains,
    });

    return NextResponse.json({
      draft,
      demo: !isDraftAIConfigured(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate draft." },
      { status: 500 },
    );
  }
}
