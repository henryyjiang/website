import type { Metadata, Viewport } from 'next'

import { OverlaySync } from '@/components/scene/OverlaySync'
import { SceneMount } from '@/components/scene/SceneMount'
import { SceneNav } from '@/components/scene/SceneNav'
import './globals.css'

export const metadata: Metadata = {
  title: 'Henry Jiang',
  description: 'Software, AI research, and drawing.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b1020',
}

/**
 * The persistent shell.
 *
 * `SceneMount` is here and not in a page on purpose: the App Router keeps a layout
 * mounted across route changes, so the Pixi application mounts exactly once for the
 * lifetime of the session. `children` is the route's overlay panel and is the only
 * thing that changes on navigation.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative h-full">
        <OverlaySync />
        <SceneMount />
        <SceneNav />
        {children}
      </body>
    </html>
  )
}
