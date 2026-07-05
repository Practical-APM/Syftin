import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { createJob, getJobs } from "@/lib/data/jobs";
import { validateJobVolumeInput } from "@/lib/pricing/estimates";
import { getOrgVerified } from "@/lib/data/email-verification";
import { getOrgBillingGates } from "@/lib/data/org-gates";

export async function GET(request: Request) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const scopeBlock = requireApiScope(auth, "read");
  if (scopeBlock) return scopeBlock;

  return withRateLimit(auth.orgId, async () => {
    const jobs = await getJobs({
      orgId: auth.orgId,
      orgName: auth.orgName,
      dpaSignedAt: null,
      role: "api",
    });

    return NextResponse.json({
      api_version: "v2",
      organization: { id: auth.orgId, name: auth.orgName },
      jobs,
    });
  });
}

export async function POST(request: Request) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const scopeBlock = requireApiScope(auth, "write");
  if (scopeBlock) return scopeBlock;

  return withRateLimit(auth.orgId, async () => {
    try {
      const gates = await getOrgBillingGates(auth.orgId);
      if (!gates.dpaSignedAt) {
        return NextResponse.json(
          { error: "Accept the Data Processing Agreement before creating jobs." },
          { status: 403 },
        );
      }

      const { assertOrgEmailVerifiedForJobs } = await import("@/lib/data/org-gates");
      const emailGate = await assertOrgEmailVerifiedForJobs(auth.orgId);
      if (!emailGate.ok) {
        return NextResponse.json({ error: emailGate.error }, { status: 403 });
      }

      const body = await request.json();
      const {
        name,
        target_url,
        example_schema,
        required_region,
        budget_cents,
        max_records,
      } = body;

      if (!name || !target_url || !example_schema) {
        return NextResponse.json(
          { error: "name, target_url, and example_schema are required" },
          { status: 400 },
        );
      }

      if (typeof example_schema !== "object" || Array.isArray(example_schema)) {
        return NextResponse.json(
          { error: "example_schema must be a JSON object" },
          { status: 400 },
        );
      }

      const volume = validateJobVolumeInput({
        max_records,
        budget_cents,
        isVerifiedAccount: gates.emailVerified,
      });
      if (!volume.ok) {
        return NextResponse.json({ error: volume.error }, { status: 400 });
      }

      const result = await createJob(
        {
          name,
          target_url,
          example_schema,
          required_region,
          budget_cents,
          max_records,
        },
        {
          orgId: auth.orgId,
          orgName: auth.orgName,
          dpaSignedAt: gates.dpaSignedAt,
          role: "api",
        },
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }

      return NextResponse.json(
        { api_version: "v2", job: result.job },
        { status: 201 },
      );
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to create job" },
        { status: 500 },
      );
    }
  });
}
