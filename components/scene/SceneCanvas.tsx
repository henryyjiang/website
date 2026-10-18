'use client'

import { Application } from '@pixi/react'
import { useEffect, useRef, useState } from 'react'

import { SceneStage } from './SceneStage'
import { StaticSceneFallback } from './StaticSceneFallback'

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

  useEffect(() => {
    // Mount instrumentation. The scene surviving navigation is the central
    // Next-specific claim of this architecture, so it is worth being able to check
    // rather than assume: this counter must stay at 1 across route changes.
    if (process.env.NODE_ENV !== 'production') {
      const w = window as unknown as { __sceneMountCount?: number }
      w.__sceneMountCount = (w.__sceneMountCount ?? 0) + 1
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {support ? (
        <Application
          resizeTo={hostRef}
          resolution={resolution}
          autoDensity
          antialias={false}
          background={0x0b1020}
          // Pointer input is read from window listeners in SceneStage, so the
          // canvas itself needs no event system. Phase 2 turns this on for
          // alpha-accurate hotspot hit testing.
          eventMode="none"
        >
          <SceneStage />
        </Application>
      ) : (
        <StaticSceneFallback />
      )}
    </div>
  )
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
    return Boolean(
      canvas.getContext('webgl2') ?? canvas.getContext('webgl'),
    )
  } catch {
    return false
  }
}
