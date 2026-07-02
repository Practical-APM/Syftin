import { NextResponse } from "next/server";
import { requireApiKeyAuth } from "@/lib/auth/api-key";
import { withRateLimit } from "@/lib/auth/rate-limit";
import { getJobs } from "@/lib/data/jobs";

export async function GET(request: Request) {
  const auth = await requireApiKeyAuth(request);
  if (!auth.ok) return auth.response;

  return withRateLimit(auth.orgId, async () => {
    const jobs = await getJobs({
      orgId: auth.orgId,
      orgName: auth.orgName,
      dpaSignedAt: null,
      role: "api",
    });

    return NextResponse.json({
      organization: { id: auth.orgId, name: auth.orgName },
      jobs,
    });
  });
}
