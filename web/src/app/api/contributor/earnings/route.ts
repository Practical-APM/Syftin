import { NextResponse } from "next/server";
import { requireContributorAuth } from "@/lib/auth/guard";
import { listContributorEarnings } from "@/lib/data/contributors";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  try {
    const earnings = await listContributorEarnings(
      auth.contributor,
      isSupabaseConfigured(),
    );
    return NextResponse.json({ earnings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed." },
      { status: 500 },
    );
  }
}
