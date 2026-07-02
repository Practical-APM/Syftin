import { NextResponse } from "next/server";
import {
  isValidUpiVpa,
  updateContributorProfile,
} from "@/lib/auth/contributor";
import { requireContributorAuth } from "@/lib/auth/guard";

export async function PATCH(request: Request) {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const displayName = (body as { displayName?: string }).displayName;
  const upiVpa = (body as { upiVpa?: string }).upiVpa;
  const networkMode = (body as { networkMode?: string }).networkMode;
  const meteredPause = (body as { meteredPause?: boolean }).meteredPause;
  const computeTier = (body as { computeTier?: string }).computeTier;

  if (upiVpa !== undefined && !isValidUpiVpa(upiVpa)) {
    return NextResponse.json({ error: "Invalid UPI ID format." }, { status: 400 });
  }

  if (
    computeTier !== undefined &&
    !["scout", "ranger", "titan"].includes(computeTier)
  ) {
    return NextResponse.json({ error: "Invalid compute tier." }, { status: 400 });
  }

  try {
    await updateContributorProfile(auth.contributor.contributorId, {
      displayName,
      upiVpa,
      networkMode,
      meteredPause,
      computeTier,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed." },
      { status: 400 },
    );
  }
}
