/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@prisma/client", "mysql2"],
};

export default nextConfig;