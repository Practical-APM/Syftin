import { NewBatchForm } from "@/components/dashboard/new-batch-form";
import { isPhase3Enabled } from "@/lib/env";
import { notFound } from "next/navigation";

export default function NewBatchPage() {
  if (!isPhase3Enabled()) {
    notFound();
  }

  return <NewBatchForm />;
}
