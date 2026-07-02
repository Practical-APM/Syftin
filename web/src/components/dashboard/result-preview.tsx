"use client";

import { useCallback, useEffect, useState } from "react";
import { FileJson, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResultPreview({ jobId, enabled }: { jobId: string; enabled: boolean }) {
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/result`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Could not load preview",
        );
      }
      const json = await res.json();
      const rows = Array.isArray(json) ? json : [json];
      setData(rows.slice(0, 3) as Record<string, unknown>[]);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Could not load preview");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      return;
    }
    load();
  }, [enabled, load, version]);

  if (!enabled) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-ivory-200 bg-graphite-950">
      <div className="flex items-center justify-between gap-2 border-b border-graphite-700/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileJson className="h-3.5 w-3.5 text-honey-400" />
          <span className="text-xs text-graphite-400">
            Preview{data ? ` (first ${data.length} records)` : ""}
          </span>
        </div>
        {error && !loading && (
          <button
            type="button"
            onClick={() => setVersion((v) => v + 1)}
            className="inline-flex items-center gap-1 text-[10px] font-medium text-honey-400 hover:text-honey-300"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
      <div className="p-4">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-graphite-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading preview…
          </div>
        )}
        {error && !loading && (
          <div className="space-y-2">
            <p className="text-xs text-red-400">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-graphite-700 bg-transparent text-xs text-graphite-300 hover:bg-graphite-800"
              onClick={() => setVersion((v) => v + 1)}
            >
              <RotateCcw className="h-3 w-3" />
              Try again
            </Button>
          </div>
        )}
        {data && !loading && !error && (
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-graphite-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
