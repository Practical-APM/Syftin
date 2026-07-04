import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { createBatch, getBatches } from "@/lib/data/batches";
import { validateJobVolumeInput } from "@/lib/pricing/estimates";
import { getOrgBillingGates } from "@/lib/data/org-gates";
import { isPhase3Enabled } from "@/lib/env";

export async function GET(request: Request) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  if (!isPhase3Enabled()) {
    return NextResponse.json({ error: "Batch API requires Phase 3." }, { status: 404 });
  }

  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const scopeBlock = requireApiScope(auth, "read");
  if (scopeBlock) return scopeBlock;

  return withRateLimit(auth.orgId, async () => {
    const batches = await getBatches({
      orgId: auth.orgId,
      orgName: auth.orgName,
      dpaSignedAt: null,
      role: "api",
    });

    return NextResponse.json({
      api_version: "v2",
      organization: { id: auth.orgId, name: auth.orgName },
      batches,
    });
  });
}

export async function POST(request: Request) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  if (!isPhase3Enabled()) {
    return NextResponse.json({ error: "Batch API requires Phase 3." }, { status: 404 });
  }

  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const scopeBlock = requireApiScope(auth, "write");
  if (scopeBlock) return scopeBlock;

  return withRateLimit(auth.orgId, async () => {
    try {
      const gates = await getOrgBillingGates(auth.orgId);
      if (!gates.dpaSignedAt) {
        return NextResponse.json(
          { error: "Accept the Data Processing Agreement before creating batches." },
          { status: 403 },
        );
      }

      const body = await request.json();
      const { name, urls, example_schema, budget_cents, max_records } = body;

      if (!name || !urls || !Array.isArray(urls) || !example_schema) {
        return NextResponse.json(
          { error: "name, urls (array), and example_schema are required" },
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

      const result = await createBatch(
        { name, urls, example_schema, budget_cents, max_records },
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
        { api_version: "v2", batch: result.batch },
        { status: 201 },
      );
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to create batch" },
        { status: 500 },
      );
    }
  });
}
