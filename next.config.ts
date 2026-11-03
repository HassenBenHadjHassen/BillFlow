import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-lib", "@prisma/client", "bcryptjs"],
  webpack(config, { dev }) {
    // Recharts 2 needs React 19 element detection to match the app's React.
    // Resolve the concrete entry so the production bundle has no conditional require.
    config.resolve.alias["react-is"] = require.resolve(
      `next/dist/compiled/react-is/cjs/react-is.${dev ? "development" : "production"}.js`
    );
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
