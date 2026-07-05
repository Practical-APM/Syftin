"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { isDevDashboard, isPhase2EnabledClient, isSupabaseClientConfigured } from "@/lib/env";

type HealthStatus = {
  supabase: boolean;
  ollama: boolean;
  worker: boolean;
  workerHint: string;
};

export function DevSetupBanner() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isDevDashboard()) return;
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() =>
        setHealth({
          supabase: false,
          ollama: false,
          worker: false,
          workerHint: "Could not reach health check.",
        }),
      );
  }, []);

  if (!isDevDashboard() || dismissed || !health) return null;

  const supabaseOk = isSupabaseClientConfigured() && health.supabase;
  const ollamaOk = health.ollama;
  const workerOk = health.worker;
  if (supabaseOk && ollamaOk && workerOk) return null;

  return (
    <div className="shrink-0 border-b border-graphite-800 bg-graphite-950 px-6 py-2.5 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
        <div className="flex gap-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-honey-400" />
          <div>
            <p className="text-[11px] font-medium text-graphite-300">
              Developer setup{" "}
              <span className="font-normal text-graphite-500">
                · hidden in production
              </span>
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-graphite-400">
              <li className="flex items-center gap-1">
                {supabaseOk ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full border border-graphite-600" />
                )}
                Supabase
              </li>
              <li className="flex items-center gap-1">
                {ollamaOk ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full border border-graphite-600" />
                )}
                Ollama
              </li>
              <li className="flex items-center gap-1">
                {workerOk ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full border border-graphite-600" />
                )}
                Worker
              </li>
            </ul>
            <p className="mt-2 text-[11px] text-graphite-500">
              <Link href="/admin" className="font-medium text-honey-400 hover:text-honey-300">
                Platform overview →
              </Link>
              {isPhase2EnabledClient() && (
                <>
                  {" · "}
                  <Link
                    href="/contributor"
                    className="font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Contributor portal
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-graphite-500 hover:bg-graphite-800 hover:text-graphite-300"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function CustomerStatusStrip() {
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    if (isDevDashboard()) return;
    fetch("/api/health")
      .then((r) => r.json())
      .then((h: HealthStatus) => {
        const ok = h.supabase && h.ollama && h.worker;
        setDegraded(!ok);
      })
      .catch(() => setDegraded(true));
  }, []);

  if (isDevDashboard() || !degraded) return null;

  return (
    <div className="shrink-0 border-b border-ivory-200 bg-ivory-100/80 px-6 py-2.5 lg:px-8">
      <p className="mx-auto max-w-6xl text-sm text-graphite-600">
        Processing may take longer than usual. If a job stays pending,{" "}
        <Link
          href="mailto:support@syftin.com"
          className="font-medium text-honey-600 hover:text-honey-500"
        >
          contact support
        </Link>
        .
      </p>
    </div>
  );
}
