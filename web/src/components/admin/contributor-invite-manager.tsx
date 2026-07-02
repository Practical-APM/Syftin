"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardHeader, DashboardPage } from "@/components/dashboard/sidebar";
import { Input } from "@/components/ui/input";
import { InlineError } from "@/components/ui/error-fallback";
import { formatDate } from "@/lib/utils";

type ContributorInvite = {
  email: string;
  accepted_at: string | null;
  created_at: string;
};

export function ContributorInviteManager() {
  const [invites, setInvites] = useState<ContributorInvite[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/contributor-invites");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load invites.");
      setLoading(false);
      return;
    }
    setInvites(data.invites ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/admin/contributor-invites", {
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

  return (
    <>
      <DashboardHeader title="Contributor invites" />
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
            placeholder="student@college.edu"
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

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-graphite-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading invites…
          </div>
        ) : error && invites.length === 0 ? (
          <InlineError message={error} onRetry={load} />
        ) : invites.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ivory-200 bg-white px-6 py-10 text-center text-sm text-graphite-500">
            No contributor invites yet. Add an email above or set{" "}
            <code className="text-xs">CONTRIBUTOR_INVITE_EMAILS</code> /{" "}
            <code className="text-xs">CONTRIBUTOR_OPEN=true</code> in env.
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
                          Signed in
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
        )}
      </DashboardPage>
    </>
  );
}
