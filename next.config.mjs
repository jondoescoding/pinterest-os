/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Type checking is owned by tsgo (`pnpm typecheck`), not Next's bundled tsc.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
