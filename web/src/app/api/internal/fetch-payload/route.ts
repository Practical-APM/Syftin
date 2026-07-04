import { NextResponse } from "next/server";
import { resolveFetchTaskHtml } from "@/lib/data/fetch-tasks";
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

/** Hub worker reads offloaded HTML without direct S3 credentials on the VM. */
export async function GET(request: Request) {
  if (!authorizeInternal(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const taskId = new URL(request.url).searchParams.get("task_id");
  if (!taskId) {
    return NextResponse.json({ error: "task_id required." }, { status: 400 });
  }

  const html = await resolveFetchTaskHtml(taskId);
  if (!html) {
    return NextResponse.json({ error: "Payload not found." }, { status: 404 });
  }

  return NextResponse.json({ html });
}
