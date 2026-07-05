import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const specPath = path.join(
      process.cwd(),
      "public",
      "openapi",
      "v2-phase5.yaml",
    );
    const body = await readFile(specPath, "utf8");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "OpenAPI spec not found" },
      { status: 404 },
    );
  }
}
