import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@repo/shared", "@repo/feed", "@repo/db", "@repo/api"],
  // Photos are served through Cloudinary transformation URLs (SPEC 5.1),
  // so Next's own image optimizer stays off and inside free limits.
  images: { unoptimized: true },
  env: {
    // Where flats and swipes come from. With a database address set, the real
    // API; without one (CI, a fresh clone), the in-browser mock, so the app
    // always runs. Only the word "api" or "mock" reaches the browser.
    NEXT_PUBLIC_DATA_SOURCE: process.env.DATABASE_URL ? "api" : "mock",
  },
};

export default nextConfig;
