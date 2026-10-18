import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Pinned explicitly. Turbopack infers the workspace root from the nearest
    // lockfile, and there is a stray package-lock.json above this directory that it
    // would otherwise pick up and then warn about ignoring.
    root: fileURLToPath(new URL('.', import.meta.url)),
  },
}

export default nextConfig
