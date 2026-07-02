"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseClientConfigured } from "@/lib/env";
import type { Job } from "@/lib/types/jobs";

export type RealtimeStatus = "connected" | "polling" | "disconnected" | "error";

type Options = {
  /** When set, demo polling only updates this job (for detail pages). */
  focusJobId?: string;
};

function mapRowToJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    name: row.name as string,
    target_url: row.target_url as string,
    domain: row.domain as string,
    status: row.status as Job["status"],
    compliance_score: row.compliance_score
      ? Number(row.compliance_score)
      : null,
    record_count: row.record_count as number | null,
    created_at: row.created_at as string,
    completed_at: row.completed_at as string | null,
    example_schema: row.example_schema as Record<string, unknown>,
    error_message: row.error_message as string | null,
    attempt_count: (row.attempt_count as number) ?? 0,
    variance_flags: Array.isArray(row.variance_flags)
      ? (row.variance_flags as string[])
      : [],
    result_url:
      row.status === "completed" ? `/api/jobs/${row.id}/result` : null,
  };
}

export function useJobsRealtime(initialJobs: Job[], options: Options = {}) {
  const { focusJobId } = options;
  const [jobs, setJobs] = useState(initialJobs);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("polling");

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  const pollJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) {
        setRealtimeStatus("error");
        return;
      }
      const data = await res.json();
      const all = data.jobs as Job[];

      if (focusJobId) {
        const match = all.find((j) => j.id === focusJobId);
        if (match) setJobs([match]);
      } else {
        setJobs(all);
      }
      setRealtimeStatus("polling");
    } catch {
      setRealtimeStatus("error");
    }
  }, [focusJobId]);

  useEffect(() => {
    if (!isSupabaseClientConfigured()) {
      setRealtimeStatus("polling");
      const interval = setInterval(pollJobs, 2000);
      return () => clearInterval(interval);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(focusJobId ? `job-${focusJobId}` : "jobs-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          ...(focusJobId ? { filter: `id=eq.${focusJobId}` } : {}),
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.id) return;
          const updated = mapRowToJob(row);

          setJobs((prev) => {
            const idx = prev.findIndex((j) => j.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            return focusJobId ? [updated] : [updated, ...prev];
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
        } else if (status === "CLOSED") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [focusJobId, pollJobs]);

  return { jobs, realtimeStatus };
}
