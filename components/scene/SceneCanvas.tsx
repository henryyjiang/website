'use client'

import { Application } from '@pixi/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { getSceneState } from '@/lib/store'
import { HOTSPOTS } from './hotspots'
import { SceneStage } from './SceneStage'
import { StaticSceneFallback } from './StaticSceneFallback'
import { useSceneAssets } from './useSceneAssets'

/**
 * The one Pixi application.
 *
 * Mounted in the root layout, not in a page. The App Router keeps a layout mounted
 * across route changes, so the canvas survives navigation; put it in a page and
 * every click destroys the Pixi app, reuploads every texture and restarts the
 * character animation. See docs/ARCHITECTURE.md § Routing.
 *
 * `useState` for the DPR rather than reading `devicePixelRatio` inline, so that the
 * value handed to Pixi is decided once per mount and a stray re-render can never
 * reinitialise the renderer with a different one.
 */
export default function SceneCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [support] = useState(detectWebGL)
  const [resolution] = useState(cappedResolution)
  const assets = useSceneAssets()

  useSceneClickNavigation()

  useEffect(() => {
    // Mount instrumentation. The scene surviving navigation is the central
    // Next-specific claim of this architecture, so it is worth being able to check
    // rather than assume: this counter must stay at 1 across route changes.
    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __sceneMountCount?: number }
      w.__sceneMountCount = (w.__sceneMountCount ?? 0) + 1
    }
  }, [])

  useEffect(() => {
    if (assets.status === 'error') {
      console.error(`[scene] ${assets.error}`)
    }
  }, [assets])

  // No manifest, no WebGL, or assets still in flight: the static composite stands in.
  // It is also the permanent answer where WebGL is unavailable, so the site still
  // functions as a portfolio (docs/ARCHITECTURE.md § Performance policy).
  if (!support || assets.status === 'error') {
    return (
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <StaticSceneFallback />
      </div>
    )
  }

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <Application
        resizeTo={hostRef}
        resolution={resolution}
        autoDensity
        antialias={false}
        background={0x0b1020}
        // Pointer input is read from window listeners in SceneStage, and hit testing
        // runs against the art's alpha mask there. Pixi's own event system would only
        // give bounding-box hits on full-canvas sprites, which is useless here.
        eventMode="none"
      >
        {assets.status === 'ready' && <SceneStage assets={assets.assets} />}
      </Application>
    </div>
  )
}

/**
 * Clicking a hotspot navigates.
 *
 * Listening on the window rather than the canvas, because the canvas is
 * `pointer-events: none` and sits behind the page — which is what lets overlay
 * panels and the keyboard nav work normally on top of it. The guard is that the
 * click must have landed on the page background rather than on any real UI, so a
 * click on an open panel never also triggers the scene underneath it.
 *
 * This is the pointer half of the deliberate duplication in
 * docs/ARCHITECTURE.md: SceneNav carries the same destinations as focusable links.
 */
function useSceneClickNavigation(): void {
  const router = useRouter()

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.defaultPrevented) return

      const target = event.target as HTMLElement | null
      // Only the page background counts. Anything with real UI on it is not ours.
      if (target && target !== document.body && target !== document.documentElement) {
        return
      }

      const { hovered, overlay } = getSceneState()
      if (!hovered || overlay) return

      const hotspot = HOTSPOTS.find((h) => h.id === hovered)
      if (hotspot) router.push(hotspot.href)
    }

    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [router])
}

/**
 * Capped at 2. A 3x phone or a 4K display otherwise renders four to nine times the
 * pixels for no visible gain on painted art.
 */
function cappedResolution(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.devicePixelRatio || 1, 2)
}

/**
 * WebGL unavailable is a real state — blocklisted drivers, hardware acceleration
 * off — and the site must still function as a portfolio when it happens. Checked
 * before mounting Pixi rather than catching its failure afterwards.
 */
function detectWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
