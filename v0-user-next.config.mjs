/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '60mb', // Increased to 60MB as requested
    },
  },
  // Improve development performance
  reactStrictMode: true,
  swcMinify: true,
  // Reduce build time by excluding certain paths from the build process
  poweredByHeader: false,
  // Optimize image handling
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
