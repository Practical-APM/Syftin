/**
 * Pre-generate contributor installer files into public/installers/.
 * Run before production deploy so downloads are static + CDN-cacheable.
 *
 * Usage:
 *   NEXT_PUBLIC_SITE_URL=https://syftin.io npm run build:installers
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  INSTALLER_OSES,
  INSTALLER_TIERS,
  buildInstallerArtifact,
} from "../src/lib/contributor/installer-file";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(scriptDir, "../public/installers");

function resolveSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

async function main() {
  const siteUrl = resolveSiteUrl();
  await mkdir(outDir, { recursive: true });

  for (const os of INSTALLER_OSES) {
    for (const tier of INSTALLER_TIERS) {
      const { fileName, body } = await buildInstallerArtifact(os, tier, siteUrl);
      const dest = path.join(outDir, fileName);
      await writeFile(dest, body);
      console.log(`→ ${fileName} (${siteUrl})`);
    }
  }

  console.log(`\n✓ ${INSTALLER_OSES.length * INSTALLER_TIERS.length} installers in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
