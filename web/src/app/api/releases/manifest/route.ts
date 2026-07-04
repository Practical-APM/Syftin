import { createHash } from "crypto";
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

async function sha256ForAsset(name: string): Promise<string | null> {
  try {
    const buf = await readFile(path.join(RELEASES_DIR, name));
    return createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

export async function GET() {
  const siteUrl = getPublicSiteUrl();
  const assetEntries = await Promise.all(
    RELEASE_PLATFORMS.flatMap((platform) => [
      { kind: "node" as const, platform },
      { kind: "playwright" as const, platform },
    ]).map(async ({ kind, platform }) => {
      const name = releaseAssetName(kind, platform);
      return {
        name,
        kind,
        platform,
        url: `${siteUrl}/releases/${name}`,
        sha256: await sha256ForAsset(name),
      };
    }),
  );

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
    assets: assetEntries,
    localBuild: localManifest,
    githubRelease: githubReleaseAssetUrl(releaseAssetName("node", "darwin-arm64"))
      ? {
          repo: process.env.SYFTIN_GITHUB_REPO ?? null,
          tag: process.env.SYFTIN_RELEASE_TAG ?? `v${SYFTIN_NODE_VERSION}`,
        }
      : null,
  });
}
