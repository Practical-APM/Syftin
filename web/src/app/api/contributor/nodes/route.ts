import { NextResponse } from "next/server";
import { requireContributorAuth } from "@/lib/auth/guard";
import {
  createContributorNode,
  listContributorNodes,
} from "@/lib/data/contributors";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  try {
    const nodes = await listContributorNodes(
      auth.contributor,
      isSupabaseConfigured(),
    );
    return NextResponse.json({ nodes });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireContributorAuth();
  if (!auth.ok) return auth.response;

  if (!auth.contributor.upiVpa?.trim()) {
    return NextResponse.json(
      {
        error:
          "Add your UPI ID in Setup before registering a device — required for payouts.",
      },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const machineLabel =
    (body as { machineLabel?: string }).machineLabel?.trim() || "My laptop";

  try {
    const { node, token } = await createContributorNode(
      auth.contributor,
      { machineLabel, computeTier: auth.contributor.computeTier },
      isSupabaseConfigured(),
    );
    return NextResponse.json({ node, token });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not register node." },
      { status: 400 },
    );
  }
}
