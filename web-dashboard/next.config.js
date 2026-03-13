/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',   // Static export for Netlify
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_API_URL:  process.env.NEXT_PUBLIC_API_URL  || 'http://localhost:3001',
    NEXT_PUBLIC_WS_URL:   process.env.NEXT_PUBLIC_WS_URL   || 'ws://localhost:3001',
  },
};

module.exports = nextConfig;
