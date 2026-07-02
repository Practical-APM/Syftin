import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { createBatch, getBatches } from "@/lib/data/batches";
import {
  checkRateLimit,
  rateLimitKey,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/security/rate-limit";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const batches = await getBatches(auth.org);
    return NextResponse.json({ batches });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch batches" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const limit = await checkRateLimit(
    rateLimitKey("jobCreate", auth.org.orgId),
    RATE_LIMITS.jobCreate,
  );
  if (!limit.ok) return rateLimitResponse(limit.resetAt);

  if (!auth.org.dpaSignedAt) {
    return NextResponse.json(
      { error: "Accept the Data Processing Agreement before creating batches." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { name, urls, example_schema, batch_pricing } = body;

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

    const result = await createBatch(
      { name, urls, example_schema, batch_pricing },
      auth.org,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ batch: result.batch }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create batch" },
      { status: 500 },
    );
  }
}
