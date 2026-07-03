"use client";

import { useMemo, useState } from "react";
import { Loader2, Thermometer } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SessionContributor } from "@/lib/auth/contributor";
import {
  formatResourceConfigToml,
  profilePresetSettings,
  RESOURCE_PROFILE_META,
  type ContributorResourceSettings,
  type ResourceProfile,
} from "@/lib/contributor/resource-settings";
import { cn } from "@/lib/utils";
import { ContributorResourceTelemetry } from "@/components/contributor/contributor-resource-telemetry";

export function ContributorResourcePanel({
  contributor,
  systemCpuCores = 8,
  systemRamGb = 16,
  gpuVramGb = 0,
}: {
  contributor: SessionContributor;
  systemCpuCores?: number;
  systemRamGb?: number;
  gpuVramGb?: number;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(contributor.resourceSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const profileMeta = RESOURCE_PROFILE_META[settings.profile];
  const gpuInferenceReady = gpuVramGb >= 4;
  const maxCpuForProfile = Math.max(
    1,
    Math.round(systemCpuCores * (profileMeta.cpuCapPercent / 100)),
  );
  const maxRamMbForProfile = Math.max(
    512,
    Math.round(systemRamGb * 1024 * (profileMeta.ramCapPercent / 100)),
  );

  const configToml = useMemo(
    () =>
      formatResourceConfigToml(
        settings,
        contributor.email ?? undefined,
        contributor.upiVpa ?? undefined,
      ),
    [settings, contributor.email, contributor.upiVpa],
  );

  function selectProfile(profile: ResourceProfile) {
    setSettings(
      profilePresetSettings(profile, systemRamGb, systemCpuCores, gpuVramGb),
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/contributor/resources", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Could not save settings.");
      return;
    }
    if ((data as { settings?: ContributorResourceSettings }).settings) {
      setSettings((data as { settings: ContributorResourceSettings }).settings);
    }
    router.refresh();
  }

  async function copyToml() {
    await navigator.clipboard.writeText(configToml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <DashboardHeader
        title="Resource controls"
        description="Choose how much CPU, memory, and heat Syftin may use on your laptop. Changes sync to your node on the next heartbeat."
      />
      <DashboardPage>
        <ContributorResourceTelemetry />
        <Panel className="max-w-2xl">
          <form onSubmit={handleSave} className="space-y-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-graphite-500">
              Operating profile
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(
                Object.entries(RESOURCE_PROFILE_META) as [
                  ResourceProfile,
                  (typeof RESOURCE_PROFILE_META)[ResourceProfile],
                ][]
              ).map(([id, meta]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectProfile(id)}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left transition-colors",
                    settings.profile === id
                      ? "border-honey-500 bg-honey-500/10"
                      : "border-graphite-700 bg-graphite-900/50 hover:border-graphite-600",
                  )}
                >
                  <span className="block text-sm font-semibold text-ivory-50">
                    {meta.label}
                  </span>
                  <span className="mt-1 block text-xs text-graphite-400">
                    {meta.summary}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="flex justify-between text-xs font-medium text-graphite-500">
                <span>CPU core limit</span>
                <span>
                  {settings.maxCpuCores} / {systemCpuCores} cores
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={maxCpuForProfile}
                value={settings.maxCpuCores}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    maxCpuCores: Number(e.target.value),
                  }))
                }
                className="mt-2 w-full accent-honey-500"
              />
            </div>
            <div>
              <label className="flex justify-between text-xs font-medium text-graphite-500">
                <span>Memory cap</span>
                <span>
                  {Math.round(settings.maxRamMb / 1024)} / {systemRamGb} GB
                </span>
              </label>
              <input
                type="range"
                min={512}
                max={maxRamMbForProfile}
                step={256}
                value={settings.maxRamMb}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    maxRamMb: Number(e.target.value),
                  }))
                }
                className="mt-2 w-full accent-honey-500"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-graphite-700 bg-graphite-900/40 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">
              <Thermometer className="h-3.5 w-3.5" />
              Thermal & activity safeguards
            </p>
            <label className="flex items-start gap-3 text-sm text-graphite-300">
              <input
                type="checkbox"
                checked={settings.requireAcPower}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    requireAcPower: e.target.checked,
                  }))
                }
                className="mt-1"
              />
              <span>Require AC power — pause on battery</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-graphite-300">
              <input
                type="checkbox"
                checked={settings.pauseOnUserActivity}
                disabled={settings.profile === "titan"}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    pauseOnUserActivity: e.target.checked,
                  }))
                }
                className="mt-1"
              />
              <span>
                Pause when I use the machine (mouse / keyboard). Titan mode
                always enables this.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-graphite-300">
              <input
                type="checkbox"
                checked={settings.blockMeteredNetworks}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    blockMeteredNetworks: e.target.checked,
                  }))
                }
                className="mt-1"
              />
              <span>Block tasks on metered / mobile hotspot connections</span>
            </label>
            <label
              className={cn(
                "flex items-start gap-3 text-sm",
                gpuInferenceReady ? "text-graphite-300" : "text-graphite-500",
              )}
            >
              <input
                type="checkbox"
                checked={settings.enableGpuInference}
                disabled={!gpuInferenceReady}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    enableGpuInference: e.target.checked,
                  }))
                }
                className="mt-1"
              />
              <span>
                Enable GPU inference (local Ollama on device) — requires NVIDIA ≥4GB VRAM
                GPU with ≥4GB VRAM
                {gpuVramGb > 0
                  ? ` · detected ${gpuVramGb.toFixed(1)}GB`
                  : " · none detected on your devices"}
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save resource settings"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={copyToml}>
              {copied ? "Copied TOML" : "Copy syftin.config.toml"}
            </Button>
          </div>
          </form>

          <p className="text-xs text-graphite-400">
            The node daemon applies PD thermal throttling between tasks, an
            emergency cooldown above {settings.emergencyCutoffC}°C, and profile
            minimum spacing ({profileMeta.minTaskDelaySec}s for {profileMeta.label}
            ). Settings also save locally at{" "}
            <code className="rounded bg-graphite-800 px-1 text-graphite-300">~/.syftin/node/</code>.
          </p>
        </Panel>
      </DashboardPage>
    </>
  );
}
