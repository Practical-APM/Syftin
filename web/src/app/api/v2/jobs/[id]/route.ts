import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/auth/api-key";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { getJob } from "@/lib/data/jobs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  return withRateLimit(auth.orgId, async () => {
    const { id } = await params;
    const job = await getJob(id, {
      orgId: auth.orgId,
      orgName: auth.orgName,
      dpaSignedAt: null,
      role: "api",
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  });
}
