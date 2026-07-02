import { readFile, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  githubReleaseAssetUrl,
  parseReleaseAsset,
} from "@/lib/releases/manifest";

const RELEASES_DIR = path.join(process.cwd(), "public", "releases");

type RouteContext = { params: Promise<{ asset: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { asset } = await context.params;

  if (asset === "manifest.json") {
    try {
      const body = await readFile(path.join(RELEASES_DIR, "manifest.json"));
      return new NextResponse(body, {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return NextResponse.redirect(
        new URL("/api/releases/manifest", _req.url),
        302,
      );
    }
  }

  const parsed = parseReleaseAsset(asset);
  if (!parsed) {
    return NextResponse.json({ error: "Unknown release asset" }, { status: 404 });
  }

  const localPath = path.join(RELEASES_DIR, asset);
  try {
    const info = await stat(localPath);
    if (!info.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await readFile(localPath);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${asset}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    const remote = githubReleaseAssetUrl(asset);
    if (remote) {
      return NextResponse.redirect(remote, 302);
    }
    return NextResponse.json(
      {
        error: "Release binary not found",
        hint: "Run bash worker/scripts/build-node-release.sh locally, or set SYFTIN_GITHUB_REPO for GitHub release redirects.",
        asset,
      },
      { status: 404 },
    );
  }
}
