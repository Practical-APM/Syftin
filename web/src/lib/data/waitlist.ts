import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

export type WaitlistLead = {
  email: string;
  source: string;
  created_at: string;
};

declare global {
  var __syftinWaitlist: WaitlistLead[] | undefined;
}

function getMemoryWaitlist(): WaitlistLead[] {
  if (!global.__syftinWaitlist) {
    global.__syftinWaitlist = [];
  }
  return global.__syftinWaitlist;
}

export async function addWaitlistLead(
  email: string,
  source = "login",
): Promise<WaitlistLead> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Valid email required.");
  }

  const lead: WaitlistLead = {
    email: normalized,
    source,
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    const list = getMemoryWaitlist();
    const existing = list.find((l) => l.email === normalized);
    if (!existing) list.unshift(lead);
    return existing ?? lead;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waitlist_leads")
    .upsert({ email: normalized, source }, { onConflict: "email" })
    .select("email, source, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as WaitlistLead;
}

export async function listWaitlistLeads(): Promise<WaitlistLead[]> {
  if (!isSupabaseConfigured()) {
    return getMemoryWaitlist();
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("waitlist_leads")
    .select("email, source, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data ?? []) as WaitlistLead[];
}
