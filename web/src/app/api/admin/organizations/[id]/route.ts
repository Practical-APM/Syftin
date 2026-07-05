import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { clearOrgBillingLock } from "@/lib/data/billing-guards";
import {
  updateOrgPilotSettings,
  type ExtractionTier,
  type SlaTier,
} from "@/lib/data/org-sla";

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

  const slaTier = (body as { sla_tier?: string }).sla_tier;
  const extractionTier = (body as { extraction_tier?: string }).extraction_tier;
  const hubOnly = (body as { hub_only_extraction?: boolean }).hub_only_extraction;

  const hasPilotPatch =
    slaTier !== undefined ||
    extractionTier !== undefined ||
    hubOnly !== undefined;

  if (!clearBillingLock && !hasPilotPatch) {
    return NextResponse.json(
      { error: "No supported patch fields." },
      { status: 400 },
    );
  }

  try {
    if (clearBillingLock) {
      await clearOrgBillingLock(id);
    }

    let pilotSettings;
    if (hasPilotPatch) {
      pilotSettings = await updateOrgPilotSettings(id, {
        ...(slaTier !== undefined
          ? { sla_tier: slaTier as SlaTier }
          : {}),
        ...(extractionTier !== undefined
          ? { extraction_tier: extractionTier as ExtractionTier }
          : {}),
        ...(hubOnly !== undefined ? { hub_only_extraction: hubOnly } : {}),
      });
    }

    return NextResponse.json({
      ok: true,
      ...(clearBillingLock ? { billing_stream_locked: false } : {}),
      ...(pilotSettings ? { pilotSettings } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed." },
      { status: 500 },
    );
  }
}
