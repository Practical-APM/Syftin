import { TIER_DETAILS, type ComputeTier } from "@/lib/contributor/tier";
import {
  computeFetchRewardPaise,
  computeTaskRewardPaise,
} from "@/lib/contributor/economics";
import {
  buildJobEconomics,
  expectedFetchTasks,
} from "@/lib/pricing/job-economics";
import { defaultPricingForDomain } from "@/lib/pricing/domain-pricing";

export type NodeResourceTelemetry = {
  profile?: string;
  temp_c?: number;
  temp_available?: boolean;
  work_allowed?: boolean;
  pause_reason?: string;
  task_delay_sec?: number;
  ram_used_mb?: number;
  ram_limit_mb?: number;
  on_ac_power?: boolean;
  connection_metered?: boolean;
  gpu_inference_on?: boolean;
  gpu_vram_used_gb?: number;
  gpu_vram_limit_gb?: number;
  reported_at?: string;
};

export const PAUSE_REASON_LABELS: Record<string, string> = {
  on_battery: "Paused — on battery power",
  user_active: "Paused — you're using the machine",
  metered_network: "Paused — metered connection",
  thermal_emergency: "Thermal cooldown — too hot",
  ram_limit: "Paused — memory cap reached",
  vram_limit: "Paused — GPU memory cap reached",
};

export type ResourceProfile = "eco" | "balanced" | "titan";

export type ContributorResourceSettings = {
  profile: ResourceProfile;
  maxCpuCores: number;
  maxRamMb: number;
  targetTemperatureC: number;
  emergencyCutoffC: number;
  emergencySleepSec: number;
  proportionalGain: number;
  derivativeGain: number;
  requireAcPower: boolean;
  pauseOnUserActivity: boolean;
  idleThresholdSec: number;
  blockMeteredNetworks: boolean;
  enableGpuInference: boolean;
};

export const DEFAULT_RESOURCE_SETTINGS: ContributorResourceSettings = {
  profile: "balanced",
  maxCpuCores: 4,
  maxRamMb: 4096,
  targetTemperatureC: 48,
  emergencyCutoffC: 55,
  emergencySleepSec: 300,
  proportionalGain: 0.15,
  derivativeGain: 0.08,
  requireAcPower: true,
  pauseOnUserActivity: true,
  idleThresholdSec: 120,
  blockMeteredNetworks: true,
  enableGpuInference: false,
};

export const RESOURCE_PROFILE_META: Record<
  ResourceProfile,
  {
    label: string;
    summary: string;
    cpuCapPercent: number;
    ramCapPercent: number;
    minTaskDelaySec: number;
  }
> = {
  eco: {
    label: "Eco",
    summary: "25% cap — silent fans, minimal heat",
    cpuCapPercent: 25,
    ramCapPercent: 25,
    minTaskDelaySec: 10,
  },
  balanced: {
    label: "Balanced",
    summary: "50% cap — recommended for most laptops",
    cpuCapPercent: 50,
    ramCapPercent: 50,
    minTaskDelaySec: 2,
  },
  titan: {
    label: "Titan",
    summary: "Maximum — 50ms input watch; pauses within ~100ms when you use the machine",
    cpuCapPercent: 100,
    ramCapPercent: 100,
    minTaskDelaySec: 0,
  },
};

export function normalizeResourceSettings(
  raw: unknown,
  systemRamGb = 8,
  systemCpuCores = 4,
  gpuVramGb = 0,
): ContributorResourceSettings {
  const base = { ...DEFAULT_RESOURCE_SETTINGS };
  if (!raw || typeof raw !== "object") {
    return applyProfileCaps(base, systemRamGb, systemCpuCores, gpuVramGb);
  }

  const o = raw as Record<string, unknown>;
  const profile = o.profile;
  if (profile === "eco" || profile === "balanced" || profile === "titan") {
    base.profile = profile;
  }

  if (typeof o.maxCpuCores === "number" && o.maxCpuCores >= 1) {
    base.maxCpuCores = Math.min(o.maxCpuCores, systemCpuCores);
  }
  if (typeof o.maxRamMb === "number" && o.maxRamMb >= 512) {
    base.maxRamMb = o.maxRamMb;
  }
  if (typeof o.targetTemperatureC === "number") {
    base.targetTemperatureC = clamp(o.targetTemperatureC, 40, 55);
  }
  if (typeof o.emergencyCutoffC === "number") {
    base.emergencyCutoffC = clamp(o.emergencyCutoffC, 50, 70);
  }
  if (typeof o.emergencySleepSec === "number") {
    base.emergencySleepSec = clamp(o.emergencySleepSec, 60, 900);
  }
  if (typeof o.proportionalGain === "number") {
    base.proportionalGain = clamp(o.proportionalGain, 0.05, 0.5);
  }
  if (typeof o.derivativeGain === "number") {
    base.derivativeGain = clamp(o.derivativeGain, 0.02, 0.3);
  }
  if (typeof o.requireAcPower === "boolean") {
    base.requireAcPower = o.requireAcPower;
  }
  if (typeof o.pauseOnUserActivity === "boolean") {
    base.pauseOnUserActivity = o.pauseOnUserActivity;
  }
  if (typeof o.idleThresholdSec === "number") {
    base.idleThresholdSec = clamp(o.idleThresholdSec, 30, 600);
  }
  if (typeof o.blockMeteredNetworks === "boolean") {
    base.blockMeteredNetworks = o.blockMeteredNetworks;
  }
  if (typeof o.enableGpuInference === "boolean") {
    base.enableGpuInference = o.enableGpuInference;
  }

  return applyProfileCaps(base, systemRamGb, systemCpuCores, gpuVramGb);
}

function applyProfileCaps(
  settings: ContributorResourceSettings,
  systemRamGb: number,
  systemCpuCores: number,
  gpuVramGb = 0,
): ContributorResourceSettings {
  const meta = RESOURCE_PROFILE_META[settings.profile];
  const maxCores = Math.max(
    1,
    Math.round(systemCpuCores * (meta.cpuCapPercent / 100)),
  );
  const maxRamMb = Math.max(
    512,
    Math.round(systemRamGb * 1024 * (meta.ramCapPercent / 100)),
  );

  return {
    ...settings,
    maxCpuCores: Math.min(settings.maxCpuCores, maxCores),
    maxRamMb: Math.min(settings.maxRamMb, maxRamMb),
    pauseOnUserActivity:
      settings.profile === "titan" ? true : settings.pauseOnUserActivity,
    enableGpuInference:
      settings.enableGpuInference && gpuVramGb >= 4,
  };
}

export function profilePresetSettings(
  profile: ResourceProfile,
  systemRamGb = 8,
  systemCpuCores = 4,
  gpuVramGb = 0,
): ContributorResourceSettings {
  return normalizeResourceSettings(
    { ...DEFAULT_RESOURCE_SETTINGS, profile },
    systemRamGb,
    systemCpuCores,
    gpuVramGb,
  );
}

export function formatResourceConfigToml(
  settings: ContributorResourceSettings,
  email?: string,
  upi?: string,
): string {
  return `# Syftin edge node — resource & thermal safeguards
# Edit here or use Contributor → Resources in the web portal.

[node_identity]
${email ? `contributor_email = "${email}"\n` : ""}${upi ? `payout_upi_id = "${upi}"\n` : ""}
[thermal_safeguards]
target_temperature = ${settings.targetTemperatureC}
proportional_gain = ${settings.proportionalGain}
derivative_gain = ${settings.derivativeGain}
emergency_cutoff_temp = ${settings.emergencyCutoffC}
emergency_sleep_duration = ${settings.emergencySleepSec}

[user_resource_allocation]
selected_profile = "${settings.profile.toUpperCase()}"
max_cpu_cores_limit = ${settings.maxCpuCores}
max_ram_mb_limit = ${settings.maxRamMb}
enable_gpu_inference = ${settings.enableGpuInference}

[system_activity_triggers]
require_ac_power = ${settings.requireAcPower}
pause_on_user_activity = ${settings.pauseOnUserActivity}
idle_threshold_seconds = ${settings.idleThresholdSec}
block_metered_networks = ${settings.blockMeteredNetworks}
`;
}

export type CalculatorOs =
  | "macos-m"
  | "linux-nv"
  | "intel-amd";

export type CapacityEstimate = {
  tier: ComputeTier;
  tierLabel: string;
  task: string;
  hourlyInr: number;
  monthlyInr: number;
  monthlyInrLow: number;
  perTaskPaise: number;
};

function pilotFleetSize(): number {
  const raw = process.env.PILOT_FLEET_SIZE?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  return 50;
}

/** Honest earnings estimate using margin-lock economics (500-row reference job). */
export function estimateNodeCapacity(input: {
  os: CalculatorOs;
  ramGb: number;
  hoursPerDay: number;
}): CapacityEstimate {
  const { os, ramGb, hoursPerDay } = input;
  let tier: ComputeTier = "scout";
  let task = "Light HTTP fetches on approved public pages";
  let tasksPerHour = 8.5;
  let gpuInference = false;

  if (os === "macos-m" && ramGb >= 16) {
    tier = "titan";
    task = "Complex multi-step parsing with browser rendering (7B-class workloads)";
    tasksPerHour = 36;
  } else if (os === "macos-m" && ramGb === 8) {
    tier = "ranger";
    task = "HTML extraction and schema refinement with Chromium";
    tasksPerHour = 18;
  } else if (os === "linux-nv" && ramGb >= 16) {
    tier = "titan";
    task = "GPU-assisted parsing on NVIDIA hardware";
    tasksPerHour = 40;
    gpuInference = true;
  } else if (os === "linux-nv" && ramGb === 8) {
    tier = "ranger";
    task = "HTML extraction and schema refinement with Chromium";
    tasksPerHour = 20;
  }

  const referenceRecords = 500;
  const economics = buildJobEconomics({
    pricing: defaultPricingForDomain("standard"),
    maxRecords: referenceRecords,
    urlCount: 1,
  });
  const fetchTasks = expectedFetchTasks(referenceRecords, false);
  const perTaskPaise = computeTaskRewardPaise(tier, "fetch", gpuInference, {
    domainBaseFeePaise: economics.pricing.baseFeePaise,
    effectiveRecords: economics.effectiveRecords,
    grossRevenuePaise: economics.grossRevenuePaise,
    workerPayoutCeilingPaise: economics.workerPayoutCeilingPaise,
    expectedFetchTasks: fetchTasks,
    nodeTasksCompleted: 0,
  });

  const fleetShare = Math.max(1, pilotFleetSize());
  const tasksPerHourAdjusted = (tasksPerHour * 60) / fleetShare;
  const hourlyInr = Math.round((tasksPerHourAdjusted * perTaskPaise) / 100);
  const monthlyInr = Math.round(hourlyInr * hoursPerDay * 30);
  const uncappedHourly = Math.round((tasksPerHourAdjusted * computeFetchRewardPaise(tier, gpuInference)) / 100);
  const monthlyInrLow = Math.round(uncappedHourly * hoursPerDay * 30 * 0.5);

  return {
    tier,
    tierLabel: TIER_DETAILS[tier].label,
    task,
    hourlyInr,
    monthlyInr,
    monthlyInrLow: Math.min(monthlyInrLow, monthlyInr),
    perTaskPaise,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
