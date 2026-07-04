import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@upstash/redis'],
  reactStrictMode: true,
}

export default nextConfig
