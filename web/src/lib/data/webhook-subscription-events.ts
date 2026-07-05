/** Client-safe webhook subscription event types and labels (no server imports). */

export type WebhookSubscriptionEvent =
  | "job.completed"
  | "job.failed"
  | "job.partial"
  | "job.page_completed"
  | "batch.completed"
  | "batch.shard_failed"
  | "batch.shard_completed"
  | "batch.partial"
  | "batch.cancelled"
  | "credit.low";

/** Events buyers can subscribe to via dashboard / API. */
export const SUBSCRIBABLE_WEBHOOK_EVENTS: WebhookSubscriptionEvent[] = [
  "job.completed",
  "job.failed",
  "job.partial",
  "job.page_completed",
  "batch.completed",
  "batch.shard_completed",
  "batch.shard_failed",
  "batch.partial",
  "batch.cancelled",
  "credit.low",
];

export const WEBHOOK_EVENT_LABELS: Record<WebhookSubscriptionEvent, string> = {
  "job.completed": "Job completed",
  "job.failed": "Job failed",
  "job.partial": "Job partial delivery",
  "job.page_completed": "Job page completed (progressive)",
  "batch.completed": "Batch completed",
  "batch.shard_completed": "Batch shard completed",
  "batch.shard_failed": "Batch shard failed",
  "batch.partial": "Batch partial (mixed success)",
  "batch.cancelled": "Batch cancelled",
  "credit.low": "Low credit balance",
};
