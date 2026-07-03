import { redirect } from "next/navigation";

export default function LegacyNewBatchPage() {
  redirect("/dashboard/jobs/new?mode=batch");
}
