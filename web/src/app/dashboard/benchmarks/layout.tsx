import { redirect } from "next/navigation";
import { isDevDashboard } from "@/lib/env";

export default function BenchmarksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDevDashboard()) {
    redirect("/dashboard");
  }

  return children;
}
