import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { revokeContributorNode } from "@/lib/data/admin-contributors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    await revokeContributorNode(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Revoke failed." },
      { status: 500 },
    );
  }
}
