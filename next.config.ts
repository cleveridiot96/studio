import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // For static export and to avoid potential network issues with optimized images:
    unoptimized: true,
    // If you still need remote patterns for `next/image` with external URLs,
    // they would go here, but ensure they are not causing the loading issues.
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'picsum.photos',
    //     port: '',
    //     pathname: '/**',
    //   },
    // ],
  },
};

export default nextConfig;
