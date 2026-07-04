import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { clearOrgBillingLock } from "@/lib/data/billing-guards";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const clearBillingLock = Boolean(
    (body as { clearBillingLock?: boolean }).clearBillingLock,
  );

  if (!clearBillingLock) {
    return NextResponse.json(
      { error: "No supported patch fields." },
      { status: 400 },
    );
  }

  try {
    await clearOrgBillingLock(id);
    return NextResponse.json({ ok: true, billing_stream_locked: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed." },
      { status: 500 },
    );
  }
}
