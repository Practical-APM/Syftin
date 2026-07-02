import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/guard";
import { sendTestSftpUpload } from "@/lib/data/sftp-delivery";

export async function POST() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const result = await sendTestSftpUpload(auth.org.orgId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      remotePath: result.remotePath,
      message: "Test file uploaded — check your SFTP server.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "SFTP test failed" },
      { status: 500 },
    );
  }
}
