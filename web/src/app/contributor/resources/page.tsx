import { getSessionContributor } from "@/lib/auth/contributor";
import { ContributorResourcePanel } from "@/components/contributor/contributor-resource-panel";
import { listContributorNodes } from "@/lib/data/contributors";
import { isSupabaseConfigured } from "@/lib/env";
import { normalizeResourceSettings } from "@/lib/contributor/resource-settings";

export default async function ContributorResourcesPage() {
  const contributor = await getSessionContributor();
  if (!contributor) return null;

  const nodes = await listContributorNodes(contributor, isSupabaseConfigured());
  let cpuCores = 4;
  let ramGb = 8;
  let gpuVramGb = 0;
  for (const node of nodes) {
    const caps = node.capabilities;
    if (!caps) continue;
    if (typeof caps.cpu_cores === "number" && caps.cpu_cores > cpuCores) {
      cpuCores = caps.cpu_cores;
    }
    if (typeof caps.ram_gb === "number" && caps.ram_gb > ramGb) {
      ramGb = caps.ram_gb;
    }
    if (typeof caps.gpu_vram_gb === "number" && caps.gpu_vram_gb > gpuVramGb) {
      gpuVramGb = caps.gpu_vram_gb;
    }
  }

  const resourceSettings = normalizeResourceSettings(
    contributor.resourceSettings,
    ramGb,
    cpuCores,
    gpuVramGb,
  );

  return (
    <ContributorResourcePanel
      contributor={{ ...contributor, resourceSettings }}
      systemCpuCores={cpuCores}
      systemRamGb={ramGb}
      gpuVramGb={gpuVramGb}
    />
  );
}
