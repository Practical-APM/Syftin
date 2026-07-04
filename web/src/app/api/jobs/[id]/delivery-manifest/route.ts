import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { buildDeliveryManifest } from "@/lib/data/delivery-manifest";
import { getJob } from "@/lib/data/jobs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  if (job.status !== "completed") {
    return NextResponse.json(
      { error: "Delivery manifest is available only for completed jobs." },
      { status: 400 },
    );
  }

  const manifest = await buildDeliveryManifest(job);
  return NextResponse.json(manifest);
}
