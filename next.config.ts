import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    const proxyTarget = (
      process.env.API_PROXY_TARGET ?? "http://172.20.10.6:3001"
    ).replace(/\/$/, "");

    return [
      {
        source: "/backend/:path*",
        destination: `${proxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
