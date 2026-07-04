import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAuthRequired, isSupabaseConfigured } from "@/lib/env";
import {
  DEFAULT_RESOURCE_SETTINGS,
  normalizeResourceSettings,
  type ContributorResourceSettings,
} from "@/lib/contributor/resource-settings";

export type SessionContributor = {
  contributorId: string;
  displayName: string | null;
  email: string | null;
  upiVpa: string | null;
  computeTier: string;
  balancePaise: number;
  networkMode: string;
  meteredPause: boolean;
  isActive: boolean;
  resourceSettings: ContributorResourceSettings;
  panVerified: boolean;
  aadhaarVerified: boolean;
  termsAcceptedAt: string | null;
  termsVersion: string | null;
};

const DEMO_CONTRIBUTOR_ID = "c0000000-0000-4000-8000-000000000001";

function isContributorInvited(email: string): boolean {
  const list = process.env.CONTRIBUTOR_INVITE_EMAILS?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (list?.includes(email.toLowerCase())) return true;
  if (process.env.CONTRIBUTOR_OPEN === "true") return true;
  if (!isAuthRequired()) return true;
  return false;
}

export async function getSessionContributor(
  userId?: string,
): Promise<SessionContributor | null> {
  if (!isSupabaseConfigured() || !isAuthRequired()) {
    return {
      contributorId: DEMO_CONTRIBUTOR_ID,
      displayName: "Demo contributor",
      email: "contributor@example.com",
      upiVpa: "demo@upi",
      computeTier: "scout",
      balancePaise: 12_450,
      networkMode: "wifi",
      meteredPause: false,
      isActive: true,
      resourceSettings: { ...DEFAULT_RESOURCE_SETTINGS },
      panVerified: true,
      aadhaarVerified: false,
      termsAcceptedAt: new Date().toISOString(),
      termsVersion: "2026-07-pilot",
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
  const { data, error } = await admin
    .from("contributors")
    .select(
      "id, display_name, email, upi_vpa, compute_tier, balance_paise, network_mode, metered_pause, is_active, resource_settings, pan_verified, aadhaar_verified, terms_accepted_at, terms_version",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    contributorId: data.id,
    displayName: data.display_name,
    email: data.email,
    upiVpa: data.upi_vpa,
    computeTier: data.compute_tier,
    balancePaise: Number(data.balance_paise ?? 0),
    networkMode: data.network_mode ?? "wifi",
    meteredPause: Boolean(data.metered_pause),
    isActive: Boolean(data.is_active),
    resourceSettings: normalizeContributorSettings(data.resource_settings),
    panVerified: Boolean(data.pan_verified),
    aadhaarVerified: Boolean(data.aadhaar_verified),
    termsAcceptedAt: (data.terms_accepted_at as string | null) ?? null,
    termsVersion: (data.terms_version as string | null) ?? null,
  };
}

function normalizeContributorSettings(raw: unknown): ContributorResourceSettings {
  return normalizeResourceSettings(raw);
}

export async function provisionContributorUser(
  userId: string,
  email: string,
): Promise<SessionContributor> {
  const existing = await getSessionContributor(userId);
  if (existing) return existing;

  const admin = createAdminClient();
  const normalizedEmail = email.toLowerCase();

  const { data: invite } = await admin
    .from("contributor_invites")
    .select("email")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (!invite && !isContributorInvited(normalizedEmail)) {
    throw new Error(
      "Your email is not on the contributor access list. Contact hello@syftin.io.",
    );
  }

  const { data: contributor, error } = await admin
    .from("contributors")
    .insert({
      user_id: userId,
      email: normalizedEmail,
      display_name: normalizedEmail.split("@")[0],
    })
    .select(
      "id, display_name, email, upi_vpa, compute_tier, balance_paise, network_mode, metered_pause, is_active, resource_settings, pan_verified, aadhaar_verified, terms_accepted_at, terms_version",
    )
    .single();

  if (error || !contributor) {
    throw new Error(error?.message ?? "Failed to create contributor profile");
  }

  if (invite) {
    await admin
      .from("contributor_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("email", normalizedEmail);
  }

  return {
    contributorId: contributor.id,
    displayName: contributor.display_name,
    email: contributor.email,
    upiVpa: contributor.upi_vpa,
    computeTier: contributor.compute_tier,
    balancePaise: Number(contributor.balance_paise ?? 0),
    networkMode: contributor.network_mode ?? "wifi",
    meteredPause: Boolean(contributor.metered_pause),
    isActive: Boolean(contributor.is_active),
    resourceSettings: normalizeContributorSettings(contributor.resource_settings),
    panVerified: Boolean(contributor.pan_verified),
    aadhaarVerified: Boolean(contributor.aadhaar_verified),
    termsAcceptedAt: (contributor.terms_accepted_at as string | null) ?? null,
    termsVersion: (contributor.terms_version as string | null) ?? null,
  };
}

export function isValidUpiVpa(vpa: string): boolean {
  return /^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}$/.test(vpa.trim());
}

export async function updateContributorProfile(
  contributorId: string,
  input: {
    displayName?: string;
    upiVpa?: string;
    networkMode?: string;
    meteredPause?: boolean;
    computeTier?: string;
    panNumber?: string;
    aadhaarLast4?: string;
  },
): Promise<void> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.upiVpa !== undefined) patch.upi_vpa = input.upiVpa;
  if (input.networkMode !== undefined) patch.network_mode = input.networkMode;
  if (input.meteredPause !== undefined) patch.metered_pause = input.meteredPause;
  if (input.computeTier !== undefined) patch.compute_tier = input.computeTier;

  if (input.panNumber !== undefined) {
    const pan = input.panNumber.trim().toUpperCase();
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      throw new Error("Invalid PAN format (e.g. ABCDE1234F).");
    }
    patch.pan_verified = pan.length > 0;
  }
  if (input.aadhaarLast4 !== undefined) {
    const last4 = input.aadhaarLast4.replace(/\D/g, "");
    if (last4 && last4.length !== 4) {
      throw new Error("Enter last 4 digits of Aadhaar only.");
    }
    patch.aadhaar_verified = last4.length === 4;
  }

  const { error } = await admin
    .from("contributors")
    .update(patch)
    .eq("id", contributorId);
  if (error) throw new Error(error.message);
}
