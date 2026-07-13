/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.50.104', '*.trycloudflare.com'],
  experimental: {
    serverActions: {
      allowedOrigins: ['*.trycloudflare.com', 'localhost:3000'],
      bodySizeLimit: '15mb',
    },
  },
}

export default nextConfig
