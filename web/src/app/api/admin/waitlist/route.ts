import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { listWaitlistLeads } from "@/lib/data/waitlist";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  try {
    const leads = await listWaitlistLeads();
    return NextResponse.json({ leads });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load waitlist" },
      { status: 500 },
    );
  }
}
