import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  githubReleaseAssetUrl,
  parseReleaseAsset,
  SYFTIN_NODE_VERSION,
  PLAYWRIGHT_DRIVER_VERSION,
  PLAYWRIGHT_GO_VERSION,
  CHROMIUM_REVISION,
  RELEASE_PLATFORMS,
  releaseAssetName,
} from "@/lib/releases/manifest";
import { getPublicSiteUrl } from "@/lib/env";

const RELEASES_DIR = path.join(process.cwd(), "public", "releases");

export async function GET() {
  const siteUrl = getPublicSiteUrl();
  const assets = RELEASE_PLATFORMS.flatMap((platform) => [
    {
      name: releaseAssetName("node", platform),
      kind: "node" as const,
      platform,
      url: `${siteUrl}/releases/${releaseAssetName("node", platform)}`,
    },
    {
      name: releaseAssetName("playwright", platform),
      kind: "playwright" as const,
      platform,
      url: `${siteUrl}/releases/${releaseAssetName("playwright", platform)}`,
    },
  ]);

  let localManifest: Record<string, unknown> | null = null;
  try {
    const raw = await readFile(path.join(RELEASES_DIR, "manifest.json"), "utf8");
    localManifest = JSON.parse(raw) as Record<string, unknown>;
  } catch {
  }

  return NextResponse.json({
    version: SYFTIN_NODE_VERSION,
    playwrightGo: PLAYWRIGHT_GO_VERSION,
    playwrightDriver: PLAYWRIGHT_DRIVER_VERSION,
    chromiumRevision: CHROMIUM_REVISION,
    installScriptUrl: `${siteUrl}/install-node.sh`,
    playwrightInstallScriptUrl: `${siteUrl}/install-playwright.sh`,
    assets,
    localBuild: localManifest,
    githubRelease: githubReleaseAssetUrl(releaseAssetName("node", "darwin-arm64"))
      ? {
          repo: process.env.SYFTIN_GITHUB_REPO ?? null,
          tag: process.env.SYFTIN_RELEASE_TAG ?? `v${SYFTIN_NODE_VERSION}`,
        }
      : null,
  });
}
