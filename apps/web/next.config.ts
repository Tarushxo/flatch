import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@repo/shared", "@repo/feed"],
  // Photos are served through Cloudinary transformation URLs (SPEC 5.1),
  // so Next's own image optimizer stays off and inside free limits.
  images: { unoptimized: true },
};

export default nextConfig;
