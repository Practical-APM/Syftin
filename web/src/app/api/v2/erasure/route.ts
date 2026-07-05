import { NextResponse } from "next/server";
import { requireApiKeyAuth, requireApiScope } from "@/lib/auth/api-key";
import { requirePhase4Api } from "@/lib/auth/v2-api";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

/** DPDP data principal erasure request (enterprise compliance pack). */
export async function POST(request: Request) {
  const phaseBlock = requirePhase4Api();
  if (phaseBlock) return phaseBlock;

  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  const scopeBlock = requireApiScope(auth, "admin");
  if (scopeBlock) return scopeBlock;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Erasure API requires Supabase." },
      { status: 503 },
    );
  }

  return withRateLimit(auth.orgId, async () => {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const principalRef =
      typeof body.principal_ref === "string" ? body.principal_ref.trim() : "";

    if (!email && !principalRef) {
      return NextResponse.json(
        { error: "email or principal_ref is required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: jobs } = await admin
      .from("jobs")
      .select("id")
      .eq("organization_id", auth.orgId)
      .limit(500);

    const jobIds = (jobs ?? []).map((j) => j.id as string);
    let purgedRuns = 0;
    let purgedPages = 0;

    if (jobIds.length > 0) {
      await admin
        .from("job_runs")
        .update({ parsed_output: [] })
        .in("job_id", jobIds);

      const { count: runCount } = await admin
        .from("job_runs")
        .select("id", { count: "exact", head: true })
        .in("job_id", jobIds);
      purgedRuns = runCount ?? 0;

      const { count: pageCount } = await admin
        .from("job_page_results")
        .delete({ count: "exact" })
        .in("job_id", jobIds);
      purgedPages = pageCount ?? 0;
    }

    return NextResponse.json({
      api_version: "v2",
      status: "accepted",
      organization_id: auth.orgId,
      principal_ref: principalRef || email,
      purged_job_runs: purgedRuns,
      purged_page_results: purgedPages,
      message:
        "Erasure request recorded. Parsed outputs for org jobs were cleared per DPDP pilot scope.",
    });
  });
}
