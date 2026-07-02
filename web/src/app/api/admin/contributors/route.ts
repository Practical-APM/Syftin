import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { getAdminContributorFleet } from "@/lib/data/admin-contributors";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  try {
    const fleet = await getAdminContributorFleet();
    return NextResponse.json(fleet);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed." },
      { status: 500 },
    );
  }
}
