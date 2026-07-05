import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAuthRequired, isSupabaseConfigured } from "@/lib/env";
import {
  listWebhookSubscriptions,
  createWebhookSubscription,
  SUBSCRIBABLE_WEBHOOK_EVENTS,
  type CreateWebhookSubscriptionInput,
  type WebhookSubscriptionEvent,
} from "@/lib/data/webhook-subscriptions";

async function getOrgId(request: Request): Promise<string | null> {
  if (!isAuthRequired() && !isSupabaseConfigured()) {
    return "a0000000-0000-4000-8000-000000000001"; // demo org
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

export async function GET(request: Request) {
  const orgId = await getOrgId(request);
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const subs = await listWebhookSubscriptions(orgId);
    return NextResponse.json({ subscriptions: subs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list subscriptions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const orgId = await getOrgId(request);
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, secret, events, description } = body as {
    url?: string;
    secret?: string;
    events?: unknown[];
    description?: string;
  };

  if (!url || typeof url !== "string" || !url.startsWith("https://")) {
    return NextResponse.json(
      { error: "url must be an HTTPS URL" },
      { status: 400 },
    );
  }

  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json(
      { error: "events must be a non-empty array" },
      { status: 400 },
    );
  }

  const validatedEvents = events.filter((e): e is WebhookSubscriptionEvent =>
    SUBSCRIBABLE_WEBHOOK_EVENTS.includes(e as WebhookSubscriptionEvent),
  );

  if (validatedEvents.length !== events.length) {
    return NextResponse.json(
      {
        error: `Invalid events. Allowed: ${SUBSCRIBABLE_WEBHOOK_EVENTS.join(", ")}`,
      },
      { status: 400 },
    );
  }

  const input: CreateWebhookSubscriptionInput = {
    url,
    events: validatedEvents,
    description: typeof description === "string" ? description : undefined,
    secret: typeof secret === "string" && secret.length > 0 ? secret : undefined,
  };

  try {
    const sub = await createWebhookSubscription(orgId, input);
    return NextResponse.json({ subscription: sub }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create subscription" },
      { status: 500 },
    );
  }
}
