import { NextResponse } from "next/server";
import {
  verifyConsensusGroupAfterHubCheck,
  verifyConsensusGroupsForJob,
} from "@/lib/data/consensus";

function assertInternalSecret(request: Request): boolean {
  const secret = process.env.INTERNAL_DELIVERY_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-internal-secret") === secret;
}

export async function POST(request: Request) {
  if (!assertInternalSecret(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const groupId = (body as { consensus_group_id?: string }).consensus_group_id;
  const jobId = (body as { job_id?: string }).job_id;
  const hubVerified = Boolean((body as { hub_verified?: boolean }).hub_verified);

  if (jobId) {
    await verifyConsensusGroupsForJob(jobId, hubVerified);
    return NextResponse.json({ ok: true });
  }

  if (!groupId) {
    return NextResponse.json(
      { error: "consensus_group_id or job_id required" },
      { status: 400 },
    );
  }

  await verifyConsensusGroupAfterHubCheck(groupId, hubVerified);
  return NextResponse.json({ ok: true });
}
