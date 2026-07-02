import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdminContributorFleet } from "@/lib/data/admin-contributors";

export type AdminOverview = {
  organizations: number;
  jobs: Record<string, number>;
  pendingInvites: number;
  worker: { ok: boolean; lastSeen: string | null; workerId: string | null };
  contributors: {
    total: number;
    nodesOnline: number;
    nodesTotal: number;
    pendingFetchTasks: number;
  };
};

export type PilotInvite = {
  email: string;
  organization_id: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type AdminOrganization = {
  id: string;
  name: string;
  slug: string;
  credit_balance_cents: number;
  dpa_signed_at: string | null;
  created_at: string;
  member_count: number;
  job_count: number;
};

export async function getAdminOverview(): Promise<AdminOverview> {
  if (!isSupabaseConfigured()) {
    const fleet = await getAdminContributorFleet();
    return {
      organizations: 1,
      jobs: { completed: 0, failed: 0, processing: 0, queued: 0 },
      pendingInvites: 0,
      worker: { ok: false, lastSeen: null, workerId: null },
      contributors: {
        total: fleet.stats.contributors,
        nodesOnline: fleet.stats.nodesOnline,
        nodesTotal: fleet.stats.nodesTotal,
        pendingFetchTasks: fleet.stats.pendingFetchTasks,
      },
    };
  }

  const supabase = createAdminClient();

  const [orgsRes, jobsRes, invitesRes, heartbeatRes, fleet] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("status"),
    supabase
      .from("pilot_invites")
      .select("email", { count: "exact", head: true })
      .is("accepted_at", null),
    supabase
      .from("worker_heartbeats")
      .select("worker_id, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getAdminContributorFleet(),
  ]);

  const jobs: Record<string, number> = {
    completed: 0,
    failed: 0,
    processing: 0,
    queued: 0,
    pending: 0,
  };
  for (const row of jobsRes.data ?? []) {
    const status = row.status as string;
    jobs[status] = (jobs[status] ?? 0) + 1;
  }

  const lastSeen = heartbeatRes.data?.last_seen_at ?? null;
  const ageMs = lastSeen ? Date.now() - new Date(lastSeen).getTime() : Infinity;

  return {
    organizations: orgsRes.count ?? 0,
    jobs,
    pendingInvites: invitesRes.count ?? 0,
    worker: {
      ok: ageMs < 30_000,
      lastSeen,
      workerId: heartbeatRes.data?.worker_id ?? null,
    },
    contributors: {
      total: fleet.stats.contributors,
      nodesOnline: fleet.stats.nodesOnline,
      nodesTotal: fleet.stats.nodesTotal,
      pendingFetchTasks: fleet.stats.pendingFetchTasks,
    },
  };
}

export async function listPilotInvites(): Promise<PilotInvite[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pilot_invites")
    .select("email, organization_id, accepted_at, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PilotInvite[];
}

export async function addPilotInvite(
  email: string,
  organizationId?: string | null,
): Promise<PilotInvite> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Valid email required.");
  }

  if (!isSupabaseConfigured()) {
    return {
      email: normalized,
      organization_id: organizationId ?? null,
      accepted_at: null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pilot_invites")
    .upsert(
      {
        email: normalized,
        organization_id: organizationId ?? null,
      },
      { onConflict: "email" },
    )
    .select("email, organization_id, accepted_at, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as PilotInvite;
}

export type ContributorInvite = {
  email: string;
  accepted_at: string | null;
  created_at: string;
};

export async function listContributorInvites(): Promise<ContributorInvite[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributor_invites")
    .select("email, accepted_at, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContributorInvite[];
}

export async function addContributorInvite(
  email: string,
): Promise<ContributorInvite> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error("Valid email required.");
  }

  if (!isSupabaseConfigured()) {
    return {
      email: normalized,
      accepted_at: null,
      created_at: new Date().toISOString(),
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contributor_invites")
    .upsert({ email: normalized }, { onConflict: "email" })
    .select("email, accepted_at, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as ContributorInvite;
}

export async function listOrganizations(): Promise<AdminOrganization[]> {
  if (!isSupabaseConfigured()) {
    return [
      {
        id: "a0000000-0000-4000-8000-000000000001",
        name: "Syftin Demo Corp",
        slug: "syftin-demo",
        credit_balance_cents: 0,
        dpa_signed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        member_count: 1,
        job_count: 0,
      },
    ];
  }

  const supabase = createAdminClient();
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, slug, credit_balance_cents, dpa_signed_at, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const enriched = await Promise.all(
    (orgs ?? []).map(async (org) => {
      const [membersRes, jobsRes] = await Promise.all([
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", org.id),
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", org.id),
      ]);

      return {
        ...org,
        credit_balance_cents: Number(org.credit_balance_cents ?? 0),
        member_count: membersRes.count ?? 0,
        job_count: jobsRes.count ?? 0,
      } as AdminOrganization;
    }),
  );

  return enriched;
}
