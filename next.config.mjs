/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image Optimization configuration
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 1080, 1200],
    imageSizes: [16, 32, 64, 128],
    minimumCacheTTL: 31536000, // Cache optimized images for 1 year
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com', // AWS S3
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com', // Cloudflare R2
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Supabase Storage
      },
    ],
  },

  // Production JS Compiler Optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },

  // Set default CDN cache headers on public API endpoints
  async headers() {
    return [
      {
        source: '/api/public/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=3600, stale-while-revalidate=59',
          },
        ],
      },
    ];
  },
};

export default nextConfig;