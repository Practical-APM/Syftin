import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ORG_ID, isAuthRequired, isSupabaseConfigured } from "@/lib/env";

export type SessionOrg = {
  orgId: string;
  orgName: string;
  dpaSignedAt: string | null;
  role: string;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function isEmailInvited(email: string): boolean {
  const list = process.env.PILOT_INVITE_EMAILS?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list?.includes(email.toLowerCase())) return true;
  if (process.env.PILOT_OPEN === "true") return true;
  if (!isAuthRequired()) return true;
  return false;
}

export async function getSessionOrg(
  userId?: string,
): Promise<SessionOrg | null> {
  if (!isSupabaseConfigured()) {
    return {
      orgId: DEMO_ORG_ID,
      orgName: "Demo workspace",
      dpaSignedAt: new Date().toISOString(),
      role: "owner",
    };
  }

  if (!isAuthRequired()) {
    return {
      orgId: DEMO_ORG_ID,
      orgName: "Demo workspace",
      dpaSignedAt: new Date().toISOString(),
      role: "owner",
    };
  }

  if (!userId) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    userId = user.id;
  }

  const admin = createAdminClient();
  const { data: membership, error } = await admin
    .from("organization_members")
    .select("organization_id, role, organizations(name, dpa_signed_at)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !membership) return null;

  const orgRaw = membership.organizations as
    | { name: string; dpa_signed_at: string | null }
    | { name: string; dpa_signed_at: string | null }[]
    | null;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;

  return {
    orgId: membership.organization_id,
    orgName: org?.name ?? "Workspace",
    dpaSignedAt: org?.dpa_signed_at ?? null,
    role: membership.role,
  };
}

export async function provisionPilotUser(
  userId: string,
  email: string,
): Promise<SessionOrg> {
  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  const existing = await getSessionOrg(userId);
  if (existing) return existing;

  let orgId = DEMO_ORG_ID;
  let orgName = "Syftin Demo Corp";

  const { data: invite } = await admin
    .from("pilot_invites")
    .select("organization_id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (invite?.organization_id) {
    orgId = invite.organization_id;
    const { data: org } = await admin
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();
    orgName = org?.name ?? orgName;
    await admin
      .from("pilot_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("email", normalizedEmail);
  } else if (isEmailInvited(normalizedEmail)) {
    const domain = normalizedEmail.split("@")[1] ?? "pilot";
    orgName = `${domain} (Pilot)`;
    const slug = `${slugify(domain)}-${userId.slice(0, 8)}`;
    const { data: org, error } = await admin
      .from("organizations")
      .insert({ name: orgName, slug })
      .select("id, name")
      .single();
    if (error || !org) {
      throw new Error(error?.message ?? "Failed to create organization");
    }
    orgId = org.id;
    orgName = org.name;
  } else {
    throw new Error(
      "Your email is not on the pilot access list. Contact support@syftin.com for access.",
    );
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    user_id: userId,
    organization_id: orgId,
    role: "owner",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  return {
    orgId,
    orgName,
    dpaSignedAt: null,
    role: "owner",
  };
}

export async function signOrganizationDpa(orgId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ dpa_signed_at: new Date().toISOString() })
    .eq("id", orgId);
  if (error) throw new Error(error.message);
}
