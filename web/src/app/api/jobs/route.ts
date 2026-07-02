import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { createJob, getJobs } from "@/lib/data/jobs";
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
    const jobs = await getJobs(auth.org);
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch jobs" },
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
      { error: "Accept the Data Processing Agreement before creating jobs." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { name, target_url, example_schema } = body;

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

    const result = await createJob(
      { name, target_url, example_schema },
      auth.org,
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ job: result.job }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create job" },
      { status: 500 },
    );
  }
}
