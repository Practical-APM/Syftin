"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Input } from "@/components/ui/input";
import { InlineError } from "@/components/ui/error-fallback";
import { formatDate } from "@/lib/utils";

type Invite = {
  email: string;
  organization_id: string | null;
  accepted_at: string | null;
  created_at: string;
};

type WaitlistLead = {
  email: string;
  source: string;
  created_at: string;
};

export function InviteManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistLead[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [waitlistLoading, setWaitlistLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/invites");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load invites.");
      setLoading(false);
      return;
    }
    setInvites(data.invites ?? []);
    setLoading(false);
  }, []);

  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    setWaitlistError(null);
    const res = await fetch("/api/admin/waitlist");
    const data = await res.json();
    if (!res.ok) {
      setWaitlistError(data.error ?? "Could not load waitlist.");
      setWaitlistLoading(false);
      return;
    }
    setWaitlist(data.leads ?? []);
    setWaitlistLoading(false);
  }, []);

  useEffect(() => {
    loadInvites();
    loadWaitlist();
  }, [loadInvites, loadWaitlist]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to add invite");
      return;
    }
    setEmail("");
    setInvites((prev) => {
      const next = prev.filter((i) => i.email !== data.invite.email);
      return [data.invite, ...next];
    });
  }

  async function promoteFromWaitlist(leadEmail: string) {
    setError(null);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: leadEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to promote lead");
      return;
    }
    setInvites((prev) => {
      const next = prev.filter((i) => i.email !== data.invite.email);
      return [data.invite, ...next];
    });
  }

  return (
    <>
      <DashboardHeader
        title="Pilot invites"
      />
      <DashboardPage>
        <form
          onSubmit={handleAdd}
          className="flex flex-wrap items-center gap-3"
        >
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="buyer@company.com"
            className="min-w-[240px] flex-1"
          />
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add invite
              </>
            )}
          </Button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section>
          <div className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-graphite-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading invites…
              </div>
            ) : error && invites.length === 0 ? (
              <InlineError message={error} onRetry={loadInvites} />
            ) : invites.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ivory-200 bg-white px-6 py-10 text-center text-sm text-graphite-500">
                No pilot invites yet. Add an email above or set{" "}
                <code className="text-xs">PILOT_INVITE_EMAILS</code> in env.
              </p>
            ) : (
              <InviteTable invites={invites} />
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-graphite-500" />
            <h2 className="text-sm font-semibold text-graphite-900">
              Early access waitlist
            </h2>
          </div>
          <p className="mt-1 text-xs text-graphite-500">
            Emails submitted from the login page in demo mode (no Supabase).
            Promote a lead to invite them.
          </p>

          <div className="mt-4">
            {waitlistLoading ? (
              <div className="flex items-center gap-2 text-sm text-graphite-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading waitlist…
              </div>
            ) : waitlistError ? (
              <InlineError message={waitlistError} onRetry={loadWaitlist} />
            ) : waitlist.length === 0 ? (
              <p className="rounded-lg border border-dashed border-ivory-200 bg-white px-6 py-8 text-center text-sm text-graphite-500">
                No waitlist signups yet. They appear when someone uses Request
                access without Supabase configured.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-ivory-200 bg-ivory-50/80">
                      <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                        Email
                      </th>
                      <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                        Source
                      </th>
                      <th className="px-5 py-3 text-xs font-medium text-graphite-500">
                        Signed up
                      </th>
                      <th className="px-5 py-3 text-xs font-medium text-graphite-500" />
                    </tr>
                  </thead>
                  <tbody>
                    {waitlist.map((lead) => {
                      const alreadyInvited = invites.some(
                        (i) => i.email === lead.email,
                      );
                      return (
                        <tr
                          key={lead.email}
                          className="border-b border-ivory-100 last:border-0"
                        >
                          <td className="px-5 py-4 font-medium text-graphite-900">
                            {lead.email}
                          </td>
                          <td className="px-5 py-4 text-xs text-graphite-500">
                            {lead.source}
                          </td>
                          <td className="px-5 py-4 text-xs text-graphite-500">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {alreadyInvited ? (
                              <span className="text-xs text-emerald-600">
                                Invited
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => promoteFromWaitlist(lead.email)}
                                className="text-xs font-medium text-honey-600 hover:text-honey-500"
                              >
                                Add to invites →
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </DashboardPage>
    </>
  );
}

function InviteTable({ invites }: { invites: Invite[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-ivory-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ivory-200 bg-ivory-50/80">
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Email
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Status
            </th>
            <th className="px-5 py-3 text-xs font-medium text-graphite-500">
              Added
            </th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr
              key={invite.email}
              className="border-b border-ivory-100 last:border-0"
            >
              <td className="px-5 py-4 font-medium text-graphite-900">
                {invite.email}
              </td>
              <td className="px-5 py-4">
                {invite.accepted_at ? (
                  <span className="text-xs font-medium text-emerald-600">
                    Accepted
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-600">
                    Pending
                  </span>
                )}
              </td>
              <td className="px-5 py-4 text-xs text-graphite-500">
                {formatDate(invite.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
