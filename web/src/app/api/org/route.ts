import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { signOrganizationDpa } from "@/lib/auth/org";

export async function POST() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    await signOrganizationDpa(auth.org.orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sign DPA" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    orgId: auth.org.orgId,
    orgName: auth.org.orgName,
    dpaSignedAt: auth.org.dpaSignedAt,
    role: auth.org.role,
    email: auth.email ?? null,
  });
}
