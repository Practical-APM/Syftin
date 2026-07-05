"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Scale } from "lucide-react";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { InlineError } from "@/components/ui/error-fallback";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { TruthArbiterTask } from "@/lib/data/truth-arbiter";

export function AdminTruthArbiterPanel() {
  const [tasks, setTasks] = useState<TruthArbiterTask[]>([]);
  const [filter, setFilter] = useState<"pending" | "resolved" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/admin/truth-arbiter?status=${filter}`)
      .then((r) => {
        if (!r.ok) throw new Error("Could not load truth arbiter queue.");
        return r.json();
      })
      .then((data) => setTasks(data.tasks ?? []))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Request failed."),
      )
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(taskId: string) {
    const resolution = notes[taskId]?.trim();
    if (!resolution) {
      setError("Enter a resolution note before resolving.");
      return;
    }
    setResolving(taskId);
    setError(null);
    const res = await fetch(`/api/admin/truth-arbiter/${taskId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution }),
    });
    const data = await res.json().catch(() => ({}));
    setResolving(null);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Resolve failed.");
      return;
    }
    load();
  }

  return (
    <>
      <DashboardHeader
        title="Truth arbiter"
        description="Review hub vs edge semantic mismatches on consensus domains."
      />
      <DashboardPage>
        <div className="mb-4 flex gap-2">
          {(["pending", "resolved", "all"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={
                filter === key
                  ? "rounded-lg bg-honey-500/15 px-3 py-1.5 text-xs font-medium text-honey-600"
                  : "rounded-lg px-3 py-1.5 text-xs text-graphite-500 hover:bg-ivory-100"
              }
            >
              {key}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading queue…
          </div>
        ) : error ? (
          <InlineError message={error} onRetry={load} />
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ivory-200 bg-white px-8 py-12 text-center">
            <Scale className="mx-auto h-8 w-8 text-graphite-400" />
            <p className="mt-4 text-sm font-medium text-graphite-900">
              No {filter === "all" ? "" : filter} arbiter tasks
            </p>
            <p className="mt-2 text-sm text-graphite-500">
              Tasks appear when hub spot-check finds semantic divergence on
              consensus domains.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-ivory-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-graphite-900">
                      {task.job_name ?? task.job_id}
                    </p>
                    <p className="mt-1 text-xs text-graphite-500">
                      {task.domain} · {formatDate(task.created_at)}
                    </p>
                    <Link
                      href={`/dashboard/jobs/${task.job_id}`}
                      className="mt-2 inline-block text-xs text-honey-600 hover:underline"
                    >
                      View job
                    </Link>
                  </div>
                  <span className="rounded-md bg-graphite-100 px-2 py-0.5 text-xs font-medium uppercase text-graphite-600">
                    {task.status}
                  </span>
                </div>

                {task.mismatch_fields.length > 0 && (
                  <p className="mt-3 text-sm text-graphite-600">
                    Mismatched fields:{" "}
                    <span className="font-mono text-xs">
                      {task.mismatch_fields.join(", ")}
                    </span>
                  </p>
                )}

                <div className="mt-2 flex flex-wrap gap-4 text-xs text-graphite-500">
                  {task.edge_hash && (
                    <span>Edge hash: {task.edge_hash.slice(0, 12)}…</span>
                  )}
                  {task.hub_hash && (
                    <span>Hub hash: {task.hub_hash.slice(0, 12)}…</span>
                  )}
                </div>

                {task.resolution && (
                  <p className="mt-3 text-sm text-graphite-700">
                    Resolution: {task.resolution}
                  </p>
                )}

                {task.status === "pending" && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <input
                      type="text"
                      placeholder="Resolution note (e.g. hub authoritative, edge poisoned)"
                      value={notes[task.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      className="flex-1 rounded-lg border border-ivory-200 px-3 py-2 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={resolving === task.id}
                      onClick={() => resolve(task.id)}
                    >
                      {resolving === task.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DashboardPage>
    </>
  );
}
