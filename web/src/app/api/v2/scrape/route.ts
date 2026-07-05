import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { runSyncScrape } from "@/lib/data/sync-scrape";

export async function POST(request: Request) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const scopeBlock = requireApiScope(auth, "write");
  if (scopeBlock) return scopeBlock;

  return withRateLimit(auth.orgId, async () => {
    try {
      const body = await request.json();
      const { target_url, example_schema, name, output_format, timeout_ms } =
        body;

      if (!target_url || !example_schema) {
        return NextResponse.json(
          { error: "target_url and example_schema are required" },
          { status: 400 },
        );
      }

      if (typeof example_schema !== "object" || Array.isArray(example_schema)) {
        return NextResponse.json(
          { error: "example_schema must be a JSON object" },
          { status: 400 },
        );
      }

      const result = await runSyncScrape(auth.orgId, {
        target_url,
        example_schema,
        name,
        output_format,
        timeout_ms,
      });

      if (!result.success) {
        const status = result.error.includes("Timed out") ? 504 : 502;
        return NextResponse.json(
          {
            api_version: "v2",
            error: result.error,
            job_id: result.job_id,
            latency_ms: result.latency_ms,
          },
          { status },
        );
      }

      return NextResponse.json({
        api_version: "v2",
        job_id: result.job_id,
        data: result.data,
        markdown: result.markdown,
        compliance_score: result.compliance_score,
        record_count: result.record_count,
        variance_flags: result.variance_flags,
        latency_ms: result.latency_ms,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync scrape failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
