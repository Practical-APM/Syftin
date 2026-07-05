import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import {
  addWhitelistDomain,
  getWhitelistDomains,
  removeWhitelistDomain,
  clearDomainSuspension,
  updateWhitelistFetchProfile,
  updateWhitelistLegalGovernance,
} from "@/lib/data/domains";
import { sanitizeDomainInput } from "@/lib/sanitize";
import { canManageWhitelist } from "@/lib/env";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";

function canWriteDomains(email?: string) {
  return canManageWhitelist() || isPlatformAdminEmail(email);
}

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const domains = await getWhitelistDomains();
    return NextResponse.json({ domains });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch domains" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  if (!canWriteDomains(auth.email)) {
    return NextResponse.json(
      { error: "Approved sites are managed by Syftin. Contact support to request a domain." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { domain, vertical } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    const check = sanitizeDomainInput(domain);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const result = await addWhitelistDomain(domain, vertical);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({ domain: result.entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add domain" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  if (!canWriteDomains(auth.email)) {
    return NextResponse.json(
      { error: "Approved sites are managed by Syftin. Contact support to request changes." },
      { status: 403 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (!domain) {
      return NextResponse.json({ error: "domain query param required" }, { status: 400 });
    }

    const result = await removeWhitelistDomain(domain);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove domain" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  if (!canWriteDomains(auth.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const domain = String(body.domain ?? "");
    if (!domain) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }

    if (body.clear_suspension === true) {
      const cleared = await clearDomainSuspension(domain);
      if (!cleared.success) {
        return NextResponse.json({ error: cleared.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true });
    }

    if (
      body.stealth_profile !== undefined ||
      body.poison_markers !== undefined
    ) {
      let stealthProfile: Record<string, unknown> | null = null;
      if (body.stealth_profile != null && body.stealth_profile !== "") {
        if (typeof body.stealth_profile === "string") {
          try {
            stealthProfile = JSON.parse(body.stealth_profile) as Record<
              string,
              unknown
            >;
          } catch {
            return NextResponse.json(
              { error: "stealth_profile must be valid JSON" },
              { status: 400 },
            );
          }
        } else if (typeof body.stealth_profile === "object") {
          stealthProfile = body.stealth_profile as Record<string, unknown>;
        }
      }

      let poisonMarkers: string[] | null = null;
      if (body.poison_markers != null) {
        if (Array.isArray(body.poison_markers)) {
          poisonMarkers = body.poison_markers.map(String);
        } else if (typeof body.poison_markers === "string") {
          poisonMarkers = body.poison_markers
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
      }

      const profileResult = await updateWhitelistFetchProfile(domain, {
        stealth_profile: stealthProfile,
        poison_markers: poisonMarkers,
      });
      if (!profileResult.success) {
        return NextResponse.json(
          { error: profileResult.error ?? "Profile update failed" },
          { status: 400 },
        );
      }
      return NextResponse.json({ domain: profileResult.entry });
    }

    const result = await updateWhitelistLegalGovernance(domain, {
      legal_basis: body.legal_basis,
      tos_url: body.tos_url,
      legal_reviewed_by: body.legal_reviewed_by,
      legal_reviewed_at: body.legal_reviewed_at,
      legal_review_due_at: body.legal_review_due_at,
      legal_notes: body.legal_notes,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Update failed" }, { status: 400 });
    }

    return NextResponse.json({ domain: result.entry });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update legal governance" },
      { status: 500 },
    );
  }
}
