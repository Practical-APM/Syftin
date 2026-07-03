import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import { DEMO_ORG_ID } from "@/lib/env";

export type ApiKeyScope = "read_only" | "read_write" | "admin" | "demo";

export type ApiKeyAuth =
  | { ok: true; orgId: string; orgName: string; scope: ApiKeyScope }
  | { ok: false; response: NextResponse };

export type ApiKeyAuthOk = Extract<ApiKeyAuth, { ok: true }>;

/** Returns a 403 response when the key scope is insufficient. */
export function requireApiScope(
  auth: ApiKeyAuthOk,
  needed: "read" | "write" | "admin",
): NextResponse | null {
  const scopeLevel: Record<ApiKeyScope, number> = {
    demo: 0,
    read_only: 1,
    read_write: 2,
    admin: 3,
  };
  const neededLevel = { read: 1, write: 2, admin: 3 }[needed];
  if (scopeLevel[auth.scope] >= neededLevel) return null;
  return NextResponse.json(
    { error: `API key scope "${auth.scope}" cannot perform this action.` },
    { status: 403 },
  );
}

const API_KEY_PREFIX = "sftn_live_";

declare global {
  var __syftinMockApiKeyHash: string | undefined;
  var __syftinMockApiKeyOrgId: string | undefined;
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function extractApiKey(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token.startsWith(API_KEY_PREFIX)) return token;
  }
  const xKey = request.headers.get("x-api-key")?.trim();
  if (xKey?.startsWith(API_KEY_PREFIX)) return xKey;
  return null;
}

export async function requireApiKeyAuth(request: Request): Promise<ApiKeyAuth> {
  const key = extractApiKey(request);
  if (!key) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing API key. Use Authorization: Bearer sftn_live_… or X-Api-Key." },
        { status: 401 },
      ),
    };
  }

  if (!isSupabaseConfigured()) {
    const expected = global.__syftinMockApiKeyHash;
    if (!expected || hashApiKey(key) !== expected) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Invalid API key." }, { status: 401 }),
      };
    }
    return {
      ok: true,
      orgId: global.__syftinMockApiKeyOrgId ?? DEMO_ORG_ID,
      orgName: "Demo workspace",
      scope: "admin",
    };
  }

  const hash = hashApiKey(key);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, name, api_key_scope, api_key_usage_count")
    .eq("api_key_hash", hash)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid API key." }, { status: 401 }),
    };
  }

  // Update usage stats asynchronously
  admin
    .from("organizations")
    .update({
      api_key_last_used_at: new Date().toISOString(),
      api_key_usage_count: (data.api_key_usage_count || 0) + 1,
    })
    .eq("id", data.id)
    .then(({ error }) => {
      if (error) console.error("Failed to update API key stats:", error);
    });

  return { 
    ok: true, 
    orgId: data.id, 
    orgName: data.name, 
    scope: (data.api_key_scope || "read_write") as ApiKeyScope 
  };
}

export function apiKeyPrefix(key: string): string {
  return key.slice(0, 16);
}

export function setMockApiKey(key: string, orgId = DEMO_ORG_ID): void {
  global.__syftinMockApiKeyHash = hashApiKey(key);
  global.__syftinMockApiKeyOrgId = orgId;
}

export { hashApiKey, API_KEY_PREFIX };
