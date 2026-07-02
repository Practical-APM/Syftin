import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";
import { addPilotInvite, listPilotInvites } from "@/lib/data/admin";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  try {
    const invites = await listPilotInvites();
    return NextResponse.json({ invites });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list invites" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { email, organization_id } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const invite = await addPilotInvite(
      email,
      typeof organization_id === "string" ? organization_id : null,
    );

    return NextResponse.json({ invite }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add invite" },
      { status: 400 },
    );
  }
}
