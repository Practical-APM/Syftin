import { NextResponse } from "next/server";
import {
  CHROMIUM_REVISION,
  PLAYWRIGHT_DRIVER_VERSION,
  PLAYWRIGHT_GO_VERSION,
  SYFTIN_NODE_VERSION,
} from "@/lib/releases/manifest";
import { getPublicSiteUrl } from "@/lib/env";

const GITHUB_RELEASES_BASE =
  process.env.SYFTIN_GITHUB_RELEASES?.trim() ||
  "https://github.com/syftin/syftin/releases/latest/download";

export async function GET() {
  const siteUrl = getPublicSiteUrl();
  return NextResponse.json({
    siteUrl,
    installScriptUrl: `${siteUrl}/install-node.sh`,
    installerDownloadUrl: `${siteUrl}/contributor/download`,
    installerApiUrl: `${siteUrl}/api/contributor/installer`,
    playwrightInstallScriptUrl: `${siteUrl}/install-playwright.sh`,
    releasesManifestUrl: `${siteUrl}/api/releases/manifest`,
    docsUrl: `${siteUrl}/contributor/help`,
    nodeType: "edge_fetcher",
    requiredEnv: ["NODE_TOKEN", "SYFTIN_API_URL"],
    installerTiers: ["scout", "ranger", "titan"],
    installerPlatforms: ["macos", "linux", "windows"],
    releaseBaseUrl: `${siteUrl}/releases`,
    githubReleasesUrl: GITHUB_RELEASES_BASE,
    version: SYFTIN_NODE_VERSION,
    playwright: {
      goVersion: PLAYWRIGHT_GO_VERSION,
      driverVersion: PLAYWRIGHT_DRIVER_VERSION,
      chromiumRevision: CHROMIUM_REVISION,
      note: "Chromium installs automatically during node setup — no Go or system Node.js required.",
    },
    platforms: [
      "darwin-arm64",
      "darwin-amd64",
      "linux-arm64",
      "linux-amd64",
    ],
  });
}
