/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.50.104', '*.trycloudflare.com', '*.cfargotunnel.com'],
  experimental: {
    serverActions: {
      allowedOrigins: ['*.trycloudflare.com', '*.cfargotunnel.com', 'localhost:3000'],
      bodySizeLimit: '15mb',
    },
  },
}

export default nextConfig
