import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Menu image uploads still use multipart form data, so the action body
      // limit needs some headroom.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
