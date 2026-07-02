import type { NodeCapabilities } from "@/lib/data/contributors";

export type ComputeTier = "scout" | "ranger" | "titan";

export const TIER_DETAILS: Record<
  ComputeTier,
  { label: string; summary: string; ram: string; software: string; canParse: boolean }
> = {
  scout: {
    label: "Scout",
    summary: "Light public pages — fast HTTP fetches",
    ram: "8 GB+ RAM",
    software: "Syftin node app only",
    canParse: false,
  },
  ranger: {
    label: "Ranger",
    summary: "JavaScript-heavy sites — browser rendering (Parse-eligible)",
    ram: "12 GB+ RAM",
    software: "Node app + Chromium (installed for you)",
    canParse: true,
  },
  titan: {
    label: "Titan",
    summary: "GPU-equipped machines — local Ollama schema extraction on edge (Parse-eligible)",
    ram: "16 GB+ RAM + GPU",
    software: "Node app + GPU drivers",
    canParse: true,
  },
};

export function tierFromCapabilities(
  caps: NodeCapabilities | null | undefined,
): ComputeTier | null {
  const raw = caps?.recommended_tier;
  if (raw === "scout" || raw === "ranger" || raw === "titan") return raw;
  return null;
}

export function formatCapabilities(caps: NodeCapabilities | null | undefined): string {
  if (!caps) return "Not detected yet — run the installer";
  const parts: string[] = [];
  if (caps.os && caps.arch) parts.push(`${caps.os}/${caps.arch}`);
  if (caps.ram_gb) parts.push(`${caps.ram_gb} GB RAM`);
  if (caps.cpu_cores) parts.push(`${caps.cpu_cores} cores`);
  if (caps.playwright_ready) parts.push("Chromium ready");
  return parts.join(" · ") || "Detected";
}

export function nodeTypeLabel(nodeType: string | null | undefined): string {
  if (nodeType === "edge_fetcher") return "Edge fetcher";
  return nodeType ?? "Edge fetcher";
}
