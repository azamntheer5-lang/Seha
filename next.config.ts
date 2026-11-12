import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Hide the Next.js dev-tools indicator so the page matches the reference.
  devIndicators: false,
  // Bundle the SQLite demo database AND the Prisma client/engines with the
  // serverless API routes so the sick-leave lookup works out of the box on
  // Netlify / Vercel deployments. Without tracing the engines, the Lambda
  // runtime cannot load the query engine .so and every API call 500s.
  outputFileTracingIncludes: {
    "/api/inquiries/sick-leave": [
      "./db/custom.db",
      "./node_modules/.prisma/**/*",
    ],
    "/api/inquiries/demo-credentials": [
      "./db/custom.db",
      "./node_modules/.prisma/**/*",
    ],
  },
};

export default nextConfig;
