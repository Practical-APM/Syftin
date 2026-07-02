import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { sendTestBucketUpload } from "@/lib/data/bucket-delivery";

export async function POST() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const result = await sendTestBucketUpload(auth.org.orgId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      objectKey: result.objectKey,
      message: "Test file uploaded — check your bucket.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bucket test failed" },
      { status: 500 },
    );
  }
}
