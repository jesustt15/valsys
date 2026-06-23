import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.32.80.12', '*.trycloudflare.com'],
  experimental: {
    serverActions: {
      allowedOrigins: ['*.trycloudflare.com', 'localhost:3000'],
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
