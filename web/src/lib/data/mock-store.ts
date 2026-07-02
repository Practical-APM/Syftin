import type { Job } from "@/lib/types/jobs";

declare global {
  var __syftinMockJobs: Job[] | undefined;
  var __syftinMockResults: Map<string, Record<string, unknown>[]> | undefined;
}

function getResultsStore(): Map<string, Record<string, unknown>[]> {
  if (!global.__syftinMockResults) {
    global.__syftinMockResults = new Map();
  }
  return global.__syftinMockResults;
}

export function getMockJobs(): Job[] {
  if (!global.__syftinMockJobs) {
    global.__syftinMockJobs = [];
  }
  return global.__syftinMockJobs;
}

export function addMockJob(job: Job): Job {
  const jobs = getMockJobs();
  jobs.unshift(job);
  return job;
}

export function getMockJob(id: string): Job | null {
  return getMockJobs().find((j) => j.id === id) ?? null;
}

export function setMockJobResult(
  id: string,
  result: Record<string, unknown>[],
): void {
  getResultsStore().set(id, result);
}

export function getMockJobResult(
  id: string,
): Record<string, unknown>[] | null {
  return getResultsStore().get(id) ?? null;
}

/** Simulates worker progress for demo mode (no Supabase/worker required). */
export function advanceDemoJob(job: Job): Job {
  const ageMs = Date.now() - new Date(job.created_at).getTime();

  if (job.status === "failed" || job.status === "completed" || job.status === "cancelled") {
    return job;
  }

  if (ageMs < 2000) {
    return { ...job, status: "queued" };
  }

  if (ageMs < 6000) {
    return { ...job, status: "processing" };
  }

  if (ageMs < 8000) {
    return { ...job, status: "validating" };
  }

  const result = [job.example_schema];
  setMockJobResult(job.id, result);

  return {
    ...job,
    status: "completed",
    compliance_score: Math.round((97.5 + Math.random() * 2) * 10) / 10,
    record_count: result.length,
    completed_at: new Date().toISOString(),
    result_url: `/api/jobs/${job.id}/result`,
  };
}

export function cancelMockJob(id: string): Job | null {
  const jobs = getMockJobs();
  const index = jobs.findIndex((j) => j.id === id);
  if (index === -1) return null;

  const job = jobs[index];
  if (!["pending", "queued", "processing", "validating"].includes(job.status)) {
    return null;
  }

  const cancelled: Job = {
    ...job,
    status: "cancelled",
    completed_at: new Date().toISOString(),
    error_message: null,
  };
  jobs[index] = cancelled;
  return cancelled;
}

export function syncDemoJobs(): Job[] {
  const jobs = getMockJobs();
  const updated = jobs.map(advanceDemoJob);
  global.__syftinMockJobs = updated;
  return updated;
}
