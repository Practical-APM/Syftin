import { NextResponse } from "next/server";
import { requireContributorAuth } from "@/lib/auth/guard";
import { acceptContributorTerms, CONTRIBUTOR_TERMS_VERSION } from "@/lib/data/contributor-terms";

export async function POST() {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  const result = await acceptContributorTerms(auth.contributor.contributorId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    terms_version: CONTRIBUTOR_TERMS_VERSION,
    terms_accepted_at: result.termsAcceptedAt,
  });
}

export async function GET() {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    terms_version: CONTRIBUTOR_TERMS_VERSION,
    terms_accepted: Boolean(auth.contributor.termsAcceptedAt),
    terms_accepted_at: auth.contributor.termsAcceptedAt,
  });
}
