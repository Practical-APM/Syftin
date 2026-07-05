import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

export type TruthArbiterTask = {
  id: string;
  job_id: string;
  domain: string;
  status: string;
  mismatch_fields: string[];
  edge_hash: string | null;
  hub_hash: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  job_name?: string | null;
};

export async function listTruthArbiterTasks(
  status: "pending" | "resolved" | "failed" | "all" = "pending",
): Promise<TruthArbiterTask[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createAdminClient();
  let query = admin
    .from("truth_arbiter_tasks")
    .select(
      "id, job_id, domain, status, mismatch_fields, edge_hash, hub_hash, resolution, created_at, resolved_at, jobs(name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => {
    const jobRow = row.jobs as { name?: string } | null;
    const { jobs: _jobs, ...task } = row as typeof row & {
      jobs?: { name?: string } | null;
    };
    const mismatch = task.mismatch_fields;
    return {
      ...task,
      mismatch_fields: Array.isArray(mismatch)
        ? (mismatch as string[])
        : [],
      job_name: jobRow?.name ?? null,
    } as TruthArbiterTask;
  });
}

export async function resolveTruthArbiterTask(
  taskId: string,
  resolution: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase not configured" };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("truth_arbiter_tasks")
    .update({
      status: "resolved",
      resolution: resolution.trim(),
      resolved_at: now,
    })
    .eq("id", taskId)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
