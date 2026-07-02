export type JobStatus =
  | "pending"
  | "queued"
  | "processing"
  | "validating"
  | "completed"
  | "failed"
  | "cancelled";

export type Job = {
  id: string;
  name: string;
  target_url: string;
  domain: string;
  status: JobStatus;
  compliance_score: number | null;
  record_count: number | null;
  created_at: string;
  completed_at: string | null;
  example_schema: Record<string, unknown>;
  result_url: string | null;
  error_message?: string | null;
  attempt_count?: number;
  variance_flags?: string[];
  parent_batch_id?: string | null;
  shard_index?: number | null;
};

export const STATUS_LABELS: Record<JobStatus, string> = {
  pending: "Waiting to start",
  queued: "In queue",
  processing: "Collecting data",
  validating: "Checking quality",
  completed: "Ready to download",
  failed: "Could not complete",
  cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<JobStatus, string> = {
  pending: "bg-graphite-500/15 text-graphite-500",
  queued: "bg-blue-500/15 text-blue-600",
  processing: "bg-honey-500/15 text-honey-600",
  validating: "bg-purple-500/15 text-purple-600",
  completed: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-red-500/15 text-red-600",
  cancelled: "bg-graphite-500/10 text-graphite-400",
};

export const CANCELLABLE_STATUSES: JobStatus[] = [
  "pending",
  "queued",
  "processing",
  "validating",
];

/* ── Phase 3: Batch types ─────────────────────────────────── */

export type TaskType = "fetch" | "parse" | "validate" | "enrich";

export type BatchPricing = "per_shard" | "per_batch";

export type JobBatch = {
  id: string;
  organization_id: string;
  name: string;
  total_shards: number;
  completed_shards: number;
  failed_shards: number;
  status: JobStatus;
  batch_pricing: BatchPricing;
  example_schema: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

/** Subset for list views (avoids sending full schema). */
export type BatchSummary = Omit<JobBatch, "example_schema">;

export const BATCH_STATUS_LABELS: Record<JobStatus, string> = {
  pending: "Preparing",
  queued: "Queued",
  processing: "Running",
  validating: "Validating",
  completed: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};
