"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseClientConfigured } from "@/lib/env";
import type { JobFetchProgress } from "@/lib/data/fetch-progress";

export function useJobFetchProgressRealtime(
  jobId: string,
  initial: JobFetchProgress | null | undefined,
) {
  const [progress, setProgress] = useState<JobFetchProgress | null>(
    initial ?? null,
  );

  useEffect(() => {
    setProgress(initial ?? null);
  }, [initial]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/fetch-progress`);
      if (!res.ok) return;
      const data = (await res.json()) as { progress: JobFetchProgress | null };
      if (data.progress) setProgress(data.progress);
    } catch {
      // keep last snapshot
    }
  }, [jobId]);

  useEffect(() => {
    if (!initial?.total) return;

    if (!isSupabaseClientConfigured()) {
      const interval = setInterval(refresh, 3000);
      return () => clearInterval(interval);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`job-progress-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fetch_tasks",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          void refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "job_page_results",
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, initial?.total, refresh]);

  return progress;
}
