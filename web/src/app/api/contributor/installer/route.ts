import { NextResponse } from "next/server";
import { requireContributorAuth } from "@/lib/auth/guard";
import { getPublicSiteUrl } from "@/lib/env";
import {
  buildInstallerArtifact,
  isInstallerOs,
  isInstallerTier,
} from "@/lib/contributor/installer-file";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const os = searchParams.get("os");
  const tier = searchParams.get("tier");

  if (!isInstallerOs(os) || !isInstallerTier(tier)) {
    return NextResponse.json(
      { error: "Provide a valid os (macos|linux|windows) and tier (scout|ranger|titan)." },
      { status: 400 },
    );
  }

  const siteUrl = getPublicSiteUrl();
  const { fileName, body, contentType } = await buildInstallerArtifact(os, tier, siteUrl);

  // Copy binary bodies into a fresh ArrayBuffer-backed view so the type is
  // Uint8Array<ArrayBuffer> (a valid BodyInit) rather than the generic
  // Uint8Array<ArrayBufferLike> JSZip returns.
  let responseBody: BodyInit;
  if (typeof body === "string") {
    responseBody = body;
  } else {
    const bytes = new Uint8Array(body.byteLength);
    bytes.set(body);
    responseBody = bytes;
  }

  return new NextResponse(responseBody, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
