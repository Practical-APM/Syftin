import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

const WORKER_STALE_MS = 30_000;

export type HealthSnapshot = {
  supabase: boolean;
  ollama: boolean;
  worker: boolean;
  workerLastSeen: string | null;
  workerId: string | null;
  contributorNodesOnline: number;
  pendingFetchTasks: number;
  status: "ready" | "degraded" | "setup_required";
};

export async function checkOllama(): Promise<boolean> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function checkWorker(): Promise<{
  ok: boolean;
  lastSeen: string | null;
  workerId: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { ok: false, lastSeen: null, workerId: null };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("worker_heartbeats")
      .select("last_seen_at, worker_id")
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.last_seen_at) {
      return { ok: false, lastSeen: null, workerId: null };
    }

    const ageMs = Date.now() - new Date(data.last_seen_at).getTime();
    return {
      ok: ageMs < WORKER_STALE_MS,
      lastSeen: data.last_seen_at,
      workerId: (data.worker_id as string | null) ?? null,
    };
  } catch {
    return { ok: false, lastSeen: null, workerId: null };
  }
}

async function contributorStats(): Promise<{
  nodesOnline: number;
  pendingFetchTasks: number;
}> {
  if (!isSupabaseConfigured()) {
    return { nodesOnline: 0, pendingFetchTasks: 0 };
  }

  try {
    const admin = createAdminClient();
    const [nodesRes, tasksRes] = await Promise.all([
      admin
        .from("contributor_nodes")
        .select("id", { count: "exact", head: true })
        .eq("status", "online"),
      admin
        .from("fetch_tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

    return {
      nodesOnline: nodesRes.count ?? 0,
      pendingFetchTasks: tasksRes.count ?? 0,
    };
  } catch {
    return { nodesOnline: 0, pendingFetchTasks: 0 };
  }
}

export async function getHealthSnapshot(
  detailed = false,
): Promise<HealthSnapshot & { hint?: string }> {
  const supabase = isSupabaseConfigured();
  const ollama = await checkOllama();
  const worker = await checkWorker();
  const stats = detailed ? await contributorStats() : { nodesOnline: 0, pendingFetchTasks: 0 };

  const coreReady = supabase && ollama && worker.ok;
  const status = coreReady ? "ready" : supabase ? "degraded" : "setup_required";

  const snapshot: HealthSnapshot & { hint?: string } = {
    supabase,
    ollama,
    worker: worker.ok,
    workerLastSeen: worker.lastSeen,
    workerId: worker.workerId,
    contributorNodesOnline: stats.nodesOnline,
    pendingFetchTasks: stats.pendingFetchTasks,
    status,
  };

  if (!coreReady) {
    snapshot.hint = "Configure Supabase, Ollama, and start the Go worker.";
  }

  return snapshot;
}

/** Public probe — minimal surface area for uptime monitors. */
export function toPublicHealth(
  snapshot: HealthSnapshot,
): Pick<HealthSnapshot, "status" | "supabase" | "worker" | "ollama"> {
  return {
    status: snapshot.status,
    supabase: snapshot.supabase,
    worker: snapshot.worker,
    ollama: snapshot.ollama,
  };
}
