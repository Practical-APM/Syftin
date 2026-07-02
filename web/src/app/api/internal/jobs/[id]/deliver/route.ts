import { NextResponse } from "next/server";
import { deliverJob, type WebhookEventType } from "@/lib/data/delivery";
import { safeEqualString } from "@/lib/security/timing-safe";

function authorizeInternal(request: Request): boolean {
  const secret = process.env.INTERNAL_DELIVERY_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return safeEqualString(auth.slice(7).trim(), secret);
  }
  return false;
}

function parseEventType(request: Request): WebhookEventType {
  const event = new URL(request.url).searchParams.get("event");
  return event === "job.failed" ? "job.failed" : "job.completed";
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!authorizeInternal(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const eventType = parseEventType(request);
  const result = await deliverJob(id, eventType);

  const webhookFailed = !result.webhook.ok && !result.webhook.skipped;
  const bucketFailed = !result.bucket.ok && !result.bucket.skipped;
  const sftpFailed = !result.sftp.ok && !result.sftp.skipped;
  const warehouseFailed = !result.warehouse.ok && !result.warehouse.skipped;
  if (webhookFailed || bucketFailed || sftpFailed || warehouseFailed) {
    return NextResponse.json(
      {
        error:
          result.webhook.error ??
          result.bucket.error ??
          result.sftp.error ??
          result.warehouse.error ??
          "Delivery failed",
        ...result,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(result);
}
