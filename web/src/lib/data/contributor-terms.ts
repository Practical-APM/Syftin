import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

/** Bump when contributor terms copy changes materially. */
export const CONTRIBUTOR_TERMS_VERSION = "2026-07-pilot";

export async function acceptContributorTerms(
  contributorId: string,
): Promise<
  { ok: true; termsAcceptedAt: string } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: true, termsAcceptedAt: new Date().toISOString() };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("contributors")
    .update({
      terms_accepted_at: now,
      terms_version: CONTRIBUTOR_TERMS_VERSION,
      updated_at: now,
    })
    .eq("id", contributorId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, termsAcceptedAt: now };
}

export async function hasAcceptedContributorTerms(
  contributorId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const admin = createAdminClient();
  const { data } = await admin
    .from("contributors")
    .select("terms_accepted_at, terms_version")
    .eq("id", contributorId)
    .single();

  if (!data?.terms_accepted_at) return false;
  return (data.terms_version as string | null) === CONTRIBUTOR_TERMS_VERSION;
}
