import type { Metadata, Viewport } from 'next'
import { Rajdhani, Share_Tech_Mono } from 'next/font/google'

import { TopNav } from '@/components/nav/TopNav'
import { OverlaySync } from '@/components/scene/OverlaySync'
import { SceneMount } from '@/components/scene/SceneMount'
import { RouteTransition } from '@/components/theme/RouteTransition'
import { DEFAULT_PALETTE, PALETTES, paletteCss } from '@/lib/theme'
import './globals.css'

/**
 * Rajdhani is the face in the reference Henry supplied — the single-storey `a`, the
 * straight-descender `g` and the flat-sided curves are its signature. Loaded through
 * `next/font` so it is self-hosted and in the first CSS payload: a webfont that
 * arrives late reflows the DOM, and worse, leaves any Pixi text measured against the
 * fallback forever (docs/ARCHITECTURE.md § Fonts in the canvas).
 */
const rajdhani = Rajdhani({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-rajdhani',
  display: 'swap',
})

/** The telemetry face: part numbers, dates, tags, anything that reads as a readout. */
const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-share-tech-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Henry Jiang',
  description: 'Software, AI research, and drawing.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: PALETTES[DEFAULT_PALETTE].ground,
}

/**
 * The persistent shell.
 *
 * `SceneMount` is here and not in a page on purpose: the App Router keeps a layout
 * mounted across route changes, so the Pixi application mounts exactly once for the
 * lifetime of the session. `children` is the route's overlay panel and is the only
 * thing that changes on navigation.
 *
 * The palette goes in as a `<style>` rather than as inline styles on `<body>`, so
 * the variables exist on `:root` where `::selection` and anything portalled can see
 * them, and so the first paint is already themed rather than flashing a default.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${rajdhani.variable} ${shareTechMono.variable}`}>
      <head>
        {/* Generated from lib/theme.ts — a fixed string, never user input. */}
        <style dangerouslySetInnerHTML={{ __html: paletteCss(DEFAULT_PALETTE) }} />
      </head>
      <body className="relative h-full">
        <OverlaySync />
        <SceneMount />
        <TopNav />
        {children}
        <RouteTransition />
      </body>
    </html>
  )
}
