import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import {
  addWhitelistDomain,
  getWhitelistDomains,
  removeWhitelistDomain,
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
