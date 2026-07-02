import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import {
  getEffectiveDomainsForOrg,
  getOrgDomainEditorState,
} from "@/lib/data/org-domains";

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const state = await getOrgDomainEditorState(auth.org.orgId);
    const effective = await getEffectiveDomainsForOrg(auth.org.orgId);
    return NextResponse.json({
      orgId: auth.org.orgId,
      orgDomains: state.orgDomains,
      usesSubset: state.usesSubset,
      effectiveDomains: effective,
      globalDomains: state.globalDomains,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load domains" },
      { status: 500 },
    );
  }
}
