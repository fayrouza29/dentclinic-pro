import path from "node:path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  compress: true,
  productionBrowserSourceMaps: false,
  logging: {
    fetches: { fullUrl: false, hmrRefreshes: false },
    browserToTerminal: false,
    serverFunctions: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false
    }
    return config
  },
}

export default nextConfig
