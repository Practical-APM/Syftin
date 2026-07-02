/** Pinned versions for contributor node + Playwright browser distribution */

export const SYFTIN_NODE_VERSION = process.env.SYFTIN_NODE_VERSION ?? "0.1.0";
export const PLAYWRIGHT_GO_VERSION = "v0.5700.1";
export const PLAYWRIGHT_DRIVER_VERSION = "1.57.0";
export const CHROMIUM_REVISION = "1200";

export type ReleasePlatform =
  | "darwin-arm64"
  | "darwin-amd64"
  | "linux-arm64"
  | "linux-amd64"
  | "windows-amd64";

export const RELEASE_PLATFORMS: ReleasePlatform[] = [
  "darwin-arm64",
  "darwin-amd64",
  "linux-arm64",
  "linux-amd64",
  "windows-amd64",
];

export type ReleaseAssetKind = "node" | "playwright";

export function releaseAssetName(
  kind: ReleaseAssetKind,
  platform: ReleasePlatform,
): string {
  const prefix = kind === "node" ? "syftin-node" : "syftin-playwright";
  const base = `${prefix}-${platform}`;
  return platform === "windows-amd64" ? `${base}.exe` : base;
}

export function parseReleaseAsset(
  filename: string,
): { kind: ReleaseAssetKind; platform: ReleasePlatform } | null {
  const node = filename.match(
    /^syftin-node-(darwin|linux|windows)-(arm64|amd64)(\.exe)?$/,
  );
  if (node) {
    return {
      kind: "node",
      platform: `${node[1]}-${node[2]}` as ReleasePlatform,
    };
  }
  const pw = filename.match(
    /^syftin-playwright-(darwin|linux|windows)-(arm64|amd64)(\.exe)?$/,
  );
  if (pw) {
    return {
      kind: "playwright",
      platform: `${pw[1]}-${pw[2]}` as ReleasePlatform,
    };
  }
  return null;
}

export function githubReleaseTag(): string {
  return process.env.SYFTIN_RELEASE_TAG ?? `v${SYFTIN_NODE_VERSION}`;
}

export function githubReleaseRepo(): string | null {
  const raw = process.env.SYFTIN_GITHUB_REPO?.trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
}

export function githubReleaseAssetUrl(asset: string): string | null {
  const repo = githubReleaseRepo();
  if (!repo) return null;
  const tag = githubReleaseTag();
  return `https://github.com/${repo}/releases/download/${tag}/${asset}`;
}
