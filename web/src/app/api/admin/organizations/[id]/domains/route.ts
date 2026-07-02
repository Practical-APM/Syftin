import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import {
  getOrgDomainEditorState,
  setOrgDomains,
} from "@/lib/data/org-domains";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const state = await getOrgDomainEditorState(id);
    return NextResponse.json({
      organizationId: id,
      orgDomains: state.orgDomains,
      usesSubset: state.usesSubset,
      globalDomains: state.globalDomains,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load domains" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const domains = Array.isArray(body.domains)
      ? body.domains.filter((d: unknown) => typeof d === "string")
      : [];

    const result = await setOrgDomains(id, domains);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      organizationId: id,
      orgDomains: result.domains,
      usesSubset: result.domains.length > 0,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update domains" },
      { status: 500 },
    );
  }
}
