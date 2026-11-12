import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Hide the Next.js dev-tools indicator so the page matches the reference.
  devIndicators: false,
  // Bundle the SQLite demo database with the serverless API routes so the
  // sick-leave lookup works out of the box on Netlify / Vercel deployments.
  outputFileTracingIncludes: {
    "/api/inquiries/sick-leave": ["./db/custom.db"],
    "/api/inquiries/demo-credentials": ["./db/custom.db"],
  },
};

export default nextConfig;
