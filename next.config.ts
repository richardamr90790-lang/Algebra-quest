import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The worker must always be re-fetched so new versions are picked up.
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    ];
  },
};

export default nextConfig;
