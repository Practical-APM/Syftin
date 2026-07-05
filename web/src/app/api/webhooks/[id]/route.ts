import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAuthRequired, isSupabaseConfigured } from "@/lib/env";
import {
  updateWebhookSubscription,
  deleteWebhookSubscription,
  SUBSCRIBABLE_WEBHOOK_EVENTS,
  type WebhookSubscriptionEvent,
} from "@/lib/data/webhook-subscriptions";

async function getOrgId(): Promise<string | null> {
  if (!isAuthRequired() && !isSupabaseConfigured()) {
    return "a0000000-0000-4000-8000-000000000001";
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { url, secret, events, enabled, description } = body as {
    url?: string;
    secret?: string;
    events?: unknown[];
    enabled?: boolean;
    description?: string;
  };

  const patch: Parameters<typeof updateWebhookSubscription>[2] = {};
  if (typeof url === "string") {
    if (!url.startsWith("https://")) {
      return NextResponse.json({ error: "url must be HTTPS" }, { status: 400 });
    }
    patch.url = url;
  }
  if (typeof secret === "string") patch.secret = secret;
  if (typeof enabled === "boolean") patch.enabled = enabled;
  if (typeof description === "string") patch.description = description;
  if (Array.isArray(events)) {
    const validated = events.filter((e): e is WebhookSubscriptionEvent =>
      SUBSCRIBABLE_WEBHOOK_EVENTS.includes(e as WebhookSubscriptionEvent),
    );
    patch.events = validated;
  }

  try {
    await updateWebhookSubscription(id, orgId, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const orgId = await getOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteWebhookSubscription(id, orgId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    );
  }
}
