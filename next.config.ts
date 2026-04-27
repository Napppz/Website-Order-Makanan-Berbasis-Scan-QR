import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // QRIS proof uploads allow files up to 3MB, so the action body limit
      // needs extra headroom for multipart form data.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
