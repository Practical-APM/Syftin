import { createAdminClient } from "@/lib/supabase/admin";
import { buildDeliveryManifest } from "@/lib/data/delivery-manifest";
import type { Job } from "@/lib/types/jobs";

export type JobAuditBundle = {
  bundle_version: "1.0";
  generated_at: string;
  job_id: string;
  organization_id: string;
  delivery_manifest: Awaited<ReturnType<typeof buildDeliveryManifest>>;
  page_results: Array<{
    page_index: number;
    record_count: number;
    target_url: string;
    created_at: string;
  }>;
  delivery_log: Array<{
    channel: string;
    event_type: string;
    status: string;
    created_at: string;
  }>;
  webhook_deliveries: Array<{
    event_type: string;
    status: string;
    reference_id: string;
    created_at: string;
  }>;
  truth_arbiter: Array<{
    id: string;
    status: string;
    mismatch_fields: unknown;
    edge_hash: string | null;
    hub_hash: string | null;
    created_at: string;
  }>;
  scrape_sync_audit: Array<{
    id: string;
    latency_ms: number | null;
    status: string;
    created_at: string;
  }>;
};

export async function buildJobAuditBundle(
  job: Job,
  organizationId: string,
): Promise<JobAuditBundle> {
  const admin = createAdminClient();
  const manifest = await buildDeliveryManifest(job);

  const [pageResults, deliveryLog, webhookLog, arbiter, syncAudit] =
    await Promise.all([
      admin
        .from("job_page_results")
        .select("page_index, record_count, target_url, created_at")
        .eq("job_id", job.id)
        .order("page_index"),
      admin
        .from("job_delivery_log")
        .select("channel, event_type, status, created_at")
        .eq("job_id", job.id)
        .order("created_at"),
      admin
        .from("webhook_delivery_log")
        .select("event_type, status, reference_id, created_at")
        .eq("reference_id", job.id)
        .order("created_at"),
      admin
        .from("truth_arbiter_tasks")
        .select("id, status, mismatch_fields, edge_hash, hub_hash, created_at")
        .eq("job_id", job.id)
        .order("created_at"),
      admin
        .from("scrape_sync_requests")
        .select("id, latency_ms, status, created_at")
        .eq("job_id", job.id)
        .order("created_at"),
    ]);

  return {
    bundle_version: "1.0",
    generated_at: new Date().toISOString(),
    job_id: job.id,
    organization_id: organizationId,
    delivery_manifest: manifest,
    page_results: (pageResults.data ?? []) as JobAuditBundle["page_results"],
    delivery_log: (deliveryLog.data ?? []) as JobAuditBundle["delivery_log"],
    webhook_deliveries: (webhookLog.data ??
      []) as JobAuditBundle["webhook_deliveries"],
    truth_arbiter: (arbiter.data ?? []) as JobAuditBundle["truth_arbiter"],
    scrape_sync_audit: (syncAudit.data ??
      []) as JobAuditBundle["scrape_sync_audit"],
  };
}
