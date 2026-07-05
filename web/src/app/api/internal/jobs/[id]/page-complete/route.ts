import { NextResponse } from "next/server";
import { safeEqualString } from "@/lib/security/timing-safe";
import { dispatchJobPageCompletedEvent } from "@/lib/data/job-subscription-events";

function authorizeInternal(request: Request): boolean {
  const secret = process.env.INTERNAL_DELIVERY_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return safeEqualString(auth.slice(7).trim(), secret);
  }
  return false;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  if (!authorizeInternal(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await context.params;
  let body: {
    page_index?: number;
    record_count?: number;
    records?: unknown[] | unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pageIndex = Number(body.page_index ?? 0);
  const recordCount = Number(body.record_count ?? 0);
  let records: unknown[] | undefined;
  if (Array.isArray(body.records)) {
    records = body.records;
  } else if (body.records && typeof body.records === "object") {
    records = [body.records];
  }

  await dispatchJobPageCompletedEvent(jobId, {
    pageIndex,
    recordCount,
    records,
  });

  return NextResponse.json({ ok: true });
}
