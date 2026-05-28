import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Trace files from the workspace root so monorepo deps are included
  outputFileTracingRoot: path.join(__dirname, "../../"),
  webpack(config) {
    config.resolve.alias["@smg/shared"] = path.resolve(
      __dirname,
      "../../libs/shared/src/index.ts"
    );
    return config;
  },
};

export default nextConfig;
