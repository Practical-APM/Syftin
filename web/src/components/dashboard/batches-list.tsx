"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { BatchTable } from "@/components/dashboard/batch-table";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BatchSummary } from "@/lib/types/jobs";

function BatchesEmptyState() {
  return (
    <Panel className="max-w-md text-center">
      <p className="text-sm text-graphite-600">No batch jobs yet.</p>
      <Link href="/dashboard/batches/new" className="mt-4 inline-block">
        <Button size="sm">Create your first batch</Button>
      </Link>
    </Panel>
  );
}

export function BatchesListClient({ batches }: { batches: BatchSummary[] }) {
  return (
    <DashboardPage>
      {batches.length === 0 ? (
        <BatchesEmptyState />
      ) : (
        <BatchTable batches={batches} />
      )}
    </DashboardPage>
  );
}

export function BatchesPageShell({ batches }: { batches: BatchSummary[] }) {
  const hasBatches = batches.length > 0;

  return (
    <>
      <DashboardHeader
        title="Batches"
        description={hasBatches ? undefined : "Run multi-URL orchestrations."}
        action={
          <Link
            href="/dashboard/batches/new"
            className="inline-flex items-center gap-2 rounded-lg bg-honey-500 px-4 py-2 text-sm font-medium text-graphite-950 shadow-sm shadow-honey-500/15 transition-colors hover:bg-honey-400"
          >
            <Plus className="h-4 w-4" />
            New batch
          </Link>
        }
      />
      <BatchesListClient batches={batches} />
    </>
  );
}
