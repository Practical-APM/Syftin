"use client";

import { useEffect, useState } from "react";
import { Activity, Battery, Thermometer, Wifi } from "lucide-react";
import {
  PAUSE_REASON_LABELS,
  type NodeResourceTelemetry,
} from "@/lib/contributor/resource-settings";
import { cn } from "@/lib/utils";

type TelemetryNode = {
  id: string;
  machine_label: string;
  status: string;
  resource_telemetry: NodeResourceTelemetry | null;
};

export function ContributorResourceTelemetry() {
  const [nodes, setNodes] = useState<TelemetryNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/contributor/resources");
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.ok && Array.isArray((data as { telemetry?: TelemetryNode[] }).telemetry)) {
        setNodes((data as { telemetry: TelemetryNode[] }).telemetry);
      }
      setLoading(false);
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const online = nodes.filter((n) => n.status === "online");

  if (loading) {
    return (
      <div className="max-w-2xl animate-pulse rounded-xl border border-ivory-200 bg-ivory-50/50 p-6">
        <div className="h-4 w-32 rounded bg-ivory-200" />
        <div className="mt-4 h-16 rounded bg-ivory-200" />
      </div>
    );
  }

  if (online.length === 0) {
    return (
      <div className="max-w-2xl rounded-xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-900">
        <p className="font-medium">No devices reporting live telemetry</p>
        <p className="mt-1 text-amber-800">
          Start your node app from{" "}
          <a href="/contributor/download" className="underline">
            Install
          </a>{" "}
          — temperature and pause status appear here within a few seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-graphite-500">
        Live device health
      </p>
      {online.map((node) => {
        const t = node.resource_telemetry;
        const stale =
          !t?.reported_at ||
          Date.now() - new Date(t.reported_at).getTime() > 30_000;

        return (
          <div
            key={node.id}
            className="rounded-xl border border-ivory-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-graphite-900">{node.machine_label}</p>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  t?.work_allowed && !stale
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-800",
                )}
              >
                {stale ? "Stale" : t?.work_allowed ? "Working" : "Paused"}
              </span>
            </div>

            {t && (
              <div className="mt-3 grid gap-2 text-xs text-graphite-600 sm:grid-cols-2">
                <Stat
                  icon={Thermometer}
                  label="Temperature"
                  value={
                    t.temp_available && t.temp_c != null
                      ? `${t.temp_c.toFixed(1)}°C`
                      : "Estimating…"
                  }
                />
                <Stat
                  icon={Activity}
                  label="Task spacing"
                  value={`${t.task_delay_sec ?? 0}s delay`}
                />
                <Stat
                  icon={Battery}
                  label="Power"
                  value={t.on_ac_power ? "AC connected" : "On battery"}
                />
                <Stat
                  icon={Wifi}
                  label="Network"
                  value={t.connection_metered ? "Metered" : "Unmetered"}
                />
                {t.pause_reason && (
                  <p className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                    {PAUSE_REASON_LABELS[t.pause_reason] ?? t.pause_reason}
                  </p>
                )}
                <p className="sm:col-span-2 text-[10px] text-graphite-400">
                  Profile: {t.profile ?? "—"} · RAM {t.ram_used_mb ?? 0}/
                  {t.ram_limit_mb ?? 0} MB
                  {t.gpu_vram_limit_gb != null && t.gpu_vram_limit_gb > 0
                    ? ` · VRAM ${(t.gpu_vram_used_gb ?? 0).toFixed(1)}/${t.gpu_vram_limit_gb.toFixed(1)} GB`
                    : ""}{" "}
                  · updated{" "}
                  {t.reported_at
                    ? new Date(t.reported_at).toLocaleTimeString()
                    : "—"}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-ivory-50 px-3 py-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-graphite-400" />
      <div>
        <p className="text-[10px] uppercase tracking-wide text-graphite-400">
          {label}
        </p>
        <p className="font-medium text-graphite-800">{value}</p>
      </div>
    </div>
  );
}
