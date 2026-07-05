import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { listUnderDeliveredJobs } from "@/lib/data/admin";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  try {
    const jobs = await listUnderDeliveredJobs();
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed." },
      { status: 500 },
    );
  }
}
