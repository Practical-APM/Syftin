import { BatchesPageShell } from "@/components/dashboard/batches-list";
import { getBatches } from "@/lib/data/batches";
import { isPhase3Enabled } from "@/lib/env";
import { notFound } from "next/navigation";

export default async function BatchesPage() {
  if (!isPhase3Enabled()) {
    notFound();
  }

  const batches = await getBatches();
  return <BatchesPageShell batches={batches} />;
}
