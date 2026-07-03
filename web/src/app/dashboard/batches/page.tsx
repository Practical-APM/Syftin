import { redirect } from "next/navigation";
import { isPhase3Enabled } from "@/lib/env";

export default function BatchesPageRedirect() {
  if (!isPhase3Enabled()) {
    redirect("/dashboard/jobs");
  }
  redirect("/dashboard/jobs?tab=batches");
}
