import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createJob, getJob, getJobResult, type CreateJobInput } from "@/lib/data/jobs";

export type SyncScrapeInput = {
  name?: string;
  target_url: string;
  example_schema: Record<string, unknown>;
  output_format?: "json" | "markdown" | "both";
  timeout_ms?: number;
};

export type SyncScrapeResult =
  | {
      success: true;
      job_id: string;
      data: unknown;
      markdown?: string;
      compliance_score: number | null;
      record_count: number | null;
      fetch_method?: string;
      variance_flags: string[];
      latency_ms: number;
    }
  | { success: false; error: string; job_id?: string; latency_ms: number };

const DEFAULT_TIMEOUT_MS = 90_000;

export async function runSyncScrape(
  orgId: string,
  input: SyncScrapeInput,
): Promise<SyncScrapeResult> {
  const started = Date.now();
  const timeoutMs = Math.min(
    Math.max(input.timeout_ms ?? DEFAULT_TIMEOUT_MS, 5_000),
    180_000,
  );

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Sync scrape requires Supabase.",
      latency_ms: Date.now() - started,
    };
  }

  const admin = createAdminClient();
  const outputFormat = input.output_format ?? "json";

  const createResult = await createJob(
    {
      name: input.name ?? `Sync scrape ${new URL(input.target_url).hostname}`,
      target_url: input.target_url,
      example_schema: {
        ...input.example_schema,
        _syftin: {
          ...(typeof input.example_schema._syftin === "object" &&
          input.example_schema._syftin !== null
            ? (input.example_schema._syftin as Record<string, unknown>)
            : {}),
          sync_scrape: true,
          hub_only: true,
        },
      },
      organization_id: orgId,
      max_records: 100,
    },
    { orgId, orgName: "", dpaSignedAt: null, role: "api" },
  );

  if (!createResult.success) {
    return {
      success: false,
      error: createResult.error,
      latency_ms: Date.now() - started,
    };
  }

  const jobId = createResult.job.id;

  await admin
    .from("jobs")
    .update({
      priority: 100,
      output_format: outputFormat,
      requires_edge_fetch: false,
      status: "queued",
    })
    .eq("id", jobId);

  await admin.from("scrape_sync_requests").insert({
    organization_id: orgId,
    job_id: jobId,
    target_url: input.target_url,
    domain: createResult.job.domain,
    output_format: outputFormat,
    status: "pending",
  });

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await getJob(jobId, {
      orgId,
      orgName: "",
      dpaSignedAt: null,
      role: "api",
    });
    if (!job) break;

    if (job.status === "completed") {
      const rows = await getJobResult(jobId, {
        orgId,
        orgName: "",
        dpaSignedAt: null,
        role: "api",
      });
      const latency = Date.now() - started;

      await admin
        .from("scrape_sync_requests")
        .update({
          status: "completed",
          latency_ms: latency,
          compliance_score: job.compliance_score,
          record_count: job.record_count,
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", jobId);

      const markdown =
        outputFormat === "markdown" || outputFormat === "both"
          ? recordsToMarkdown(rows ?? [])
          : undefined;

      return {
        success: true,
        job_id: jobId,
        data: outputFormat === "markdown" ? undefined : rows,
        markdown:
          outputFormat === "markdown"
            ? markdown
            : outputFormat === "both"
              ? markdown
              : undefined,
        compliance_score: job.compliance_score,
        record_count: job.record_count,
        variance_flags: job.variance_flags ?? [],
        latency_ms: latency,
      };
    }

    if (job.status === "failed") {
      const latency = Date.now() - started;
      await admin
        .from("scrape_sync_requests")
        .update({
          status: "failed",
          latency_ms: latency,
          error_message: job.error_message,
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", jobId);

      return {
        success: false,
        error: job.error_message ?? "Scrape failed",
        job_id: jobId,
        latency_ms: latency,
      };
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  const latency = Date.now() - started;
  await admin
    .from("scrape_sync_requests")
    .update({
      status: "timeout",
      latency_ms: latency,
      error_message: `Timed out after ${timeoutMs}ms`,
      completed_at: new Date().toISOString(),
    })
    .eq("job_id", jobId);

  return {
    success: false,
    error: `Sync scrape timed out after ${timeoutMs}ms`,
    job_id: jobId,
    latency_ms: latency,
  };
}

function recordsToMarkdown(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  return rows
    .map((row, index) => {
      const lines = Object.entries(row)
        .filter(([key]) => !key.startsWith("_"))
        .map(([key, value]) => `- **${key}**: ${String(value ?? "")}`);
      return `## Record ${index + 1}\n${lines.join("\n")}`;
    })
    .join("\n\n");
}
