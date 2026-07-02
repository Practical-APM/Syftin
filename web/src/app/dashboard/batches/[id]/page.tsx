import { notFound } from "next/navigation";
import { getBatch } from "@/lib/data/batches";
import { isPhase3Enabled } from "@/lib/env";
import { BatchDetailClient } from "@/components/dashboard/batch-detail-client";

export default async function BatchDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  if (!isPhase3Enabled()) {
    notFound();
  }

  const { id } = await props.params;
  const data = await getBatch(id);

  if (!data) {
    notFound();
  }

  return <BatchDetailClient initialBatch={data.batch} initialJobs={data.jobs} />;
}
