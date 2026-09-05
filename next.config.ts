import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 100],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "a0.muscache.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async rewrites() {
    return [{ source: "/api/calendar/:propertySlug.ics", destination: "/api/calendar/:propertySlug" }];
  },
};

export default nextConfig;
