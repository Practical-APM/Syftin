import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getAdminContributorFleet } from "@/lib/data/admin-contributors";
import { getBillingGuardStats } from "@/lib/data/billing-guards";
import { isEmailConfigured } from "@/lib/email/mailer";
import { isPayloadStorageConfigured } from "@/lib/storage/payload-storage";

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
  distributedFetch: {
    inFlight: number;
    completed: number;
    failed: number;
    expired: number;
    jobsAwaitingCapacity: number;
  };
  governance: {
    totalDomains: number;
    domainsPendingReview: number;
    domainsReviewOverdue: number;
  };
  truthArbiter?: {
    pending: number;
  };
  infra: {
    payloadStorageConfigured: boolean;
    emailApiConfigured: boolean;
    billingLockedOrgs: number;
    recentLedgerDeltas: number;
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
  billing_stream_locked: boolean;
  billing_lock_reason: string | null;
  sla_tier: "pilot" | "business" | "enterprise";
  extraction_tier: "standard" | "business" | "premium";
  hub_only_extraction: boolean;
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
      distributedFetch: {
        inFlight: 0,
        completed: 0,
        failed: 0,
        expired: 0,
        jobsAwaitingCapacity: 0,
      },
      governance: {
        totalDomains: 0,
        domainsPendingReview: 0,
        domainsReviewOverdue: 0,
      },
      truthArbiter: { pending: 0 },
      infra: {
        payloadStorageConfigured: isPayloadStorageConfigured(),
        emailApiConfigured: isEmailConfigured(),
        billingLockedOrgs: 0,
        recentLedgerDeltas: 0,
      },
    };
  }

  const supabase = createAdminClient();
  const billingStats = await getBillingGuardStats();

  const [orgsRes, jobsRes, invitesRes, heartbeatRes, fleet, fetchTasksRes, edgeJobsRes, domainsRes, arbiterRes] =
    await Promise.all([
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
      supabase.from("fetch_tasks").select("status"),
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("requires_edge_fetch", true),
      supabase
        .from("whitelist_domains")
        .select("legal_reviewed_at, legal_review_due_at, is_active")
        .eq("is_active", true),
      supabase
        .from("truth_arbiter_tasks")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
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

  const fetchCounts = { inFlight: 0, completed: 0, failed: 0, expired: 0 };
  for (const row of fetchTasksRes.data ?? []) {
    const status = row.status as string;
    if (status === "pending" || status === "claimed") fetchCounts.inFlight++;
    else if (status === "completed") fetchCounts.completed++;
    else if (status === "failed") fetchCounts.failed++;
    else if (status === "expired") fetchCounts.expired++;
  }

  const now = Date.now();
  let domainsPendingReview = 0;
  let domainsReviewOverdue = 0;
  for (const row of domainsRes.data ?? []) {
    if (!row.legal_reviewed_at) domainsPendingReview++;
    const due = row.legal_review_due_at as string | null;
    if (due && new Date(due).getTime() < now) domainsReviewOverdue++;
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
    distributedFetch: {
      inFlight: fetchCounts.inFlight,
      completed: fetchCounts.completed,
      failed: fetchCounts.failed,
      expired: fetchCounts.expired,
      jobsAwaitingCapacity: edgeJobsRes.count ?? 0,
    },
    governance: {
      totalDomains: (domainsRes.data ?? []).length,
      domainsPendingReview,
      domainsReviewOverdue,
    },
    truthArbiter: {
      pending: arbiterRes.error ? 0 : (arbiterRes.count ?? 0),
    },
    infra: {
      payloadStorageConfigured: isPayloadStorageConfigured(),
      emailApiConfigured: isEmailConfigured(),
      billingLockedOrgs: billingStats.lockedOrgs,
      recentLedgerDeltas: billingStats.recentLedgerDeltas,
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
        billing_stream_locked: false,
        billing_lock_reason: null,
        sla_tier: "pilot",
        extraction_tier: "standard",
        hub_only_extraction: false,
        created_at: new Date().toISOString(),
        member_count: 1,
        job_count: 0,
      },
    ];
  }

  const supabase = createAdminClient();
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, slug, credit_balance_cents, dpa_signed_at, billing_stream_locked, billing_lock_reason, sla_tier, extraction_tier, hub_only_extraction, created_at")
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
        sla_tier: (org.sla_tier as AdminOrganization["sla_tier"]) ?? "pilot",
        extraction_tier:
          (org.extraction_tier as AdminOrganization["extraction_tier"]) ??
          "standard",
        hub_only_extraction: Boolean(org.hub_only_extraction),
        member_count: membersRes.count ?? 0,
        job_count: jobsRes.count ?? 0,
      } as AdminOrganization;
    }),
  );

  return enriched;
}

export type UnderDeliveredJob = {
  id: string;
  name: string;
  domain: string;
  organization_id: string;
  record_count: number | null;
  created_at: string;
  variance_flags: string[];
};

export async function listUnderDeliveredJobs(
  limit = 20,
): Promise<UnderDeliveredJob[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .select(
      "id, name, domain, organization_id, record_count, created_at, variance_flags",
    )
    .eq("status", "completed")
    .contains("variance_flags", ["under_delivered"])
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    organization_id: row.organization_id as string,
    record_count: row.record_count as number | null,
    created_at: row.created_at as string,
    variance_flags: (row.variance_flags as string[]) ?? [],
  }));
}
