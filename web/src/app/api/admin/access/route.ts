import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/guard";

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (!auth.ok) {
    return NextResponse.json({ admin: false }, { status: 403 });
  }
  return NextResponse.json({ admin: true });
}
