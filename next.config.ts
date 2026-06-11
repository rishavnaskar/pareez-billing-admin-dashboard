import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Next 16 uses Turbopack by default; an empty config silences the migration warning.
  turbopack: {},
};

export default nextConfig;
