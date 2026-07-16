/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: ['192.168.50.104', '*.trycloudflare.com', '*.cfargotunnel.com', 'agrogas.online', '*.agrogas.online'],
  experimental: {
    serverActions: {
      allowedOrigins: ['*.trycloudflare.com', '*.cfargotunnel.com', 'localhost:3000', 'agrogas.online', '*.agrogas.online'],
      bodySizeLimit: '15mb',
    },
  },
}

export default nextConfig
