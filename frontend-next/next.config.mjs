/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://backend:8000/api/:path*/' },
    ];
  },
};

export default config;
