import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { listOrganizations } from "@/lib/data/admin";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  try {
    const organizations = await listOrganizations();
    return NextResponse.json({ organizations });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load orgs" },
      { status: 500 },
    );
  }
}
