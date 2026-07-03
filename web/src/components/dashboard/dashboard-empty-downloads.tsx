"use client";

import Link from "next/link";
import { ArrowDownToLine } from "lucide-react";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DashboardEmptyDownloads() {
  return (
    <Panel className="max-w-md text-center">
      <p className="text-sm text-graphite-600 dark:text-graphite-300">
        Completed jobs appear here for download.
      </p>
      <Link href="/dashboard/jobs/new" className="mt-4 inline-block">
        <Button size="sm" className="group">
          Create a job
          <ArrowDownToLine className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
        </Button>
      </Link>
    </Panel>
  );
}
