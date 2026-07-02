import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContributor } from "@/lib/auth/contributor";
import { getSessionOrg, type SessionOrg } from "@/lib/auth/org";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { isAuthRequired, isSupabaseClientConfigured } from "@/lib/env";

export type AuthResult =
  | { ok: true; userId: string; email?: string; org: SessionOrg }
  | { ok: false; response: NextResponse };

export type ContributorAuthResult =
  | { ok: true; userId: string; email?: string; contributor: NonNullable<Awaited<ReturnType<typeof getSessionContributor>>> }
  | { ok: false; response: NextResponse };

export async function requireApiAuth(): Promise<AuthResult> {
  if (!isAuthRequired()) {
    const org = await getSessionOrg("demo-user");
    if (!org) {
      return {
        ok: false,
        response: NextResponse.json({ error: "No workspace" }, { status: 500 }),
      };
    }
    return { ok: true, userId: "demo-user", org };
  }

  if (!isSupabaseClientConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication is required but Supabase is not configured." },
        { status: 503 },
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const org = await getSessionOrg(user.id);
  if (!org) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Workspace not provisioned. Sign in again or contact support." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: user.id, email: user.email, org };
}

export async function requirePlatformAdmin(): Promise<AuthResult> {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth;

  if (!isPlatformAdminEmail(auth.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}

export async function requireContributorAuth(): Promise<ContributorAuthResult> {
  if (!isAuthRequired()) {
    const contributor = await getSessionContributor("demo-contributor");
    if (!contributor) {
      return {
        ok: false,
        response: NextResponse.json({ error: "No contributor profile" }, { status: 500 }),
      };
    }
    return { ok: true, userId: "demo-contributor", contributor };
  }

  if (!isSupabaseClientConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Authentication required but Supabase is not configured." },
        { status: 503 },
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const contributor = await getSessionContributor(user.id);
  if (!contributor) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Contributor profile not found. Complete setup first." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: user.id, email: user.email, contributor };
}
