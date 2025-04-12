/** @type {import('next').NextConfig} */
const nextConfig = {
  // Improve development performance
  reactStrictMode: true,
  swcMinify: true,
  // Reduce build time by excluding certain paths from the build process
  poweredByHeader: false,
  // Optimize image handling
  images: {
    domains: ['lh3.googleusercontent.com'],
    formats: ['image/avif', 'image/webp'],
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
};

export default nextConfig;
