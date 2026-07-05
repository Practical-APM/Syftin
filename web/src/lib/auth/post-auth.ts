import { createAdminClient } from "@/lib/supabase/admin";
import { isContributorInvited } from "@/lib/auth/contributor";
import { isEmailInvited } from "@/lib/auth/org";
import { normalizeAuthNext } from "@/lib/auth/normalize-next";

export { normalizeAuthNext } from "@/lib/auth/normalize-next";

/**
 * Pick where to send the user after magic-link sign-in when `next` is missing
 * or defaulted to /dashboard (Supabase redirect allow-list often strips query params).
 */
export async function resolvePostAuthDestination(params: {
  email: string;
  userId: string;
  preferredNext: string | null;
}): Promise<string> {
  const explicit = normalizeAuthNext(params.preferredNext);
  if (explicit && explicit !== "/dashboard") return explicit;

  const admin = createAdminClient();
  const email = params.email.toLowerCase();

  const { data: existingContributor } = await admin
    .from("contributors")
    .select("id")
    .eq("user_id", params.userId)
    .maybeSingle();
  if (existingContributor) return "/contributor";

  const { data: invite } = await admin
    .from("contributor_invites")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  const contributorInvited =
    Boolean(invite) || isContributorInvited(email);
  const pilotInvited = isEmailInvited(email);

  if (contributorInvited && !pilotInvited) return "/contributor";

  return explicit ?? "/dashboard";
}
