import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    return [
      {
        source: '/api-docs',
        destination: `${apiUrl}/api-docs`,
      },
      {
        source: '/api-docs.json',
        destination: `${apiUrl}/api-docs.json`,
      },
      {
        source: '/api-docs/:path*',
        destination: `${apiUrl}/api-docs/:path*`,
      },
    ]
  },
}

export default nextConfig
