import { NextResponse } from "next/server";
import { isPhase4Enabled } from "@/lib/env";

export function requirePhase4Api(): NextResponse | null {
  if (!isPhase4Enabled()) {
    return NextResponse.json(
      { error: "Enterprise API v2 is not enabled." },
      { status: 404 },
    );
  }
  return null;
}
