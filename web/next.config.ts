import type { NextConfig } from "next";
import path from "path";
import { staticSecurityHeaders } from "@/lib/security/headers";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ["ssh2", "ssh2-sftp-client", "snowflake-sdk"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: staticSecurityHeaders,
      },
    ];
  },
};

export default nextConfig;
