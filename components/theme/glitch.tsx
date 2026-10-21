'use client'

import { useEffect, useRef, useState } from 'react'

import { getSceneState, setTransition, type Transition } from '@/lib/store'

/**
 * The glitch burst, as something more than one surface can fire.
 *
 * Anatomy and timing are in docs/DESIGN.md § Glitch as the transition, measured
 * frame by frame off the reference Henry supplied. The short version: the image is
 * replaced by irregular horizontal bands of saturated colour over large areas of
 * black, and it resolves in one step rather than easing out.
 *
 * **Stepped, not tweened.** Each frame is a fresh set of bands held for ~36 ms,
 * which is how the reference reads at 30 fps — hard, discontinuous, no interpolation
 * between states. A tweened version of the same idea slides and smears and stops
 * looking like corruption. This is also why nothing here is a CSS transition: there
 * is nothing to transition between.
 *
 * This lives apart from `RouteTransition` because two things now fire it: a route
 * change, and the Art popup opening over a piece. That is not a loosening of "glitch
 * is only for route changes" (docs/DESIGN.md) — the popup *is* a destination, it has
 * its own URL and the back button closes it. What the rule forbids is glitching on
 * hover, on load, or on a timer, and nothing here can.
 */

/** Total length of the burst. Front-loaded: worst distortion in the first third. */
const DURATION_MS = 320

/** Frame length. 36 ms ≈ 28 fps, close enough to the reference's 30 to read the same. */
const FRAME_MS = 36

const FRAMES = Math.round(DURATION_MS / FRAME_MS)

/** What reduced motion gets instead: long enough to read as a change, short enough to ignore. */
const REDUCED_MS = 120

/**
 * `?glitch=8` runs the burst eight times slower, in development only.
 *
 * A 320 ms effect is too fast to judge frame by frame, and judging it frame by frame
 * is exactly what tuning it needs — the reference had to be stepped through the same
 * way. The frame *count* does not change, only how long each one is held, so what is
 * slowed down is the real sequence rather than a different one.
 *
 * Read once, at mount. The first navigation replaces the URL with one that has no
 * query string, so reading it per transition would apply the override to exactly
 * zero of the transitions it was asked for.
 */
function timeScale(): number {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return 1
  const value = Number(new URLSearchParams(window.location.search).get('glitch'))
  return Number.isFinite(value) && value > 0 ? Math.min(value, 40) : 1
}

/**
 * How violent each frame is, 0–1.
 *
 * Hand-written rather than generated from a curve, because the shape matters more
 * than the smoothness: two frames of onset, a hard peak, then a stepped collapse.
 * The reference's recovery is not symmetrical with its attack and neither is this.
 */
const ENVELOPE = [0.45, 0.85, 1, 1, 0.9, 0.6, 0.3, 0.12, 0] as const

/** Deterministic per frame, so a frame does not reshuffle if React re-renders it. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

type Band = {
  top: number
  left: number
  width: number
  height: number
  shift: number
  colour: string
  opacity: number
}

/**
 * One frame's bands.
 *
 * Three things make this read as corruption rather than as decoration, all of them
 * taken off the reference frame by frame:
 *
 * 1. **Heights are skewed, not uniform.** Many hairlines, a few thick blocks.
 *    Evenly sized bands read as a venetian blind, which is the easiest way to get
 *    this wrong.
 * 2. **Bands are mostly opaque.** At the reference's peak the source image is
 *    essentially gone — not tinted, replaced. Translucent bands look like a filter
 *    sitting on top of a page that is still perfectly readable underneath.
 * 3. **Not all of them span the frame.** Partial-width blocks starting at arbitrary
 *    x are what give it the look of corrupted macroblocks rather than of scanlines.
 *
 * Black counts as a colour and does as much work as the neons do.
 */
function buildBands(frame: number, intensity: number): Band[] {
  const random = rng(frame * 9301 + 49297)
  const count = Math.round(8 + intensity * 22)
  const bands: Band[] = []

  for (let i = 0; i < count; i++) {
    const thick = random() < 0.38
    const partial = random() < 0.45
    const roll = random()

    bands.push({
      top: random() * 100,
      left: partial ? random() * 55 : -10,
      width: partial ? 20 + random() * 50 : 120,
      height: thick ? 2 + random() * 9 : 0.25 + random() * 1.4,
      shift: (random() - 0.5) * 2 * intensity * 16,
      colour:
        roll < 0.32
          ? '#000'
          : roll < 0.54
            ? 'var(--alert)'
            : roll < 0.76
              ? 'var(--active)'
              : roll < 0.92
                ? 'var(--primary)'
                : 'var(--text)',
      // Mostly solid. The few that are not give the stack some depth without
      // letting the page underneath stay legible.
      opacity: random() < 0.75 ? 1 : 0.4 + random() * 0.45,
    })
  }

  return bands
}

/**
 * Play one burst whenever `trigger` changes to a new value.
 *
 * The first value is a page load rather than a change, and glitching on arrival
 * would make the site look broken before anyone had touched it, so it is only
 * recorded. `null` means there is nothing to burst for and resets that guard — which
 * is what lets a closed popup not count as a destination the next open has to differ
 * from.
 *
 * The scene behind glitches too, from the same timestamp in the store, so the two
 * read as one event (docs/ARCHITECTURE.md § The transition layer). React owns the
 * clock because React is what knows the destination changed.
 */
export function GlitchBurst({ trigger }: { trigger: string | null }) {
  const [frame, setFrame] = useState<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  const seen = useRef<string | null>(null)
  const scaleRef = useRef<number | null>(null)
  scaleRef.current ??= timeScale()

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReducedMotion(query.matches)
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (trigger === null) {
      seen.current = null
      return
    }
    if (seen.current === trigger) return
    const first = seen.current === null
    seen.current = trigger
    if (first) return

    // Reduced motion gets a short crossfade instead: the store still learns a
    // transition happened, so the scene can fade rather than displace, but nothing
    // here draws a band.
    const scale = scaleRef.current ?? 1
    const duration = (reducedMotion ? REDUCED_MS : DURATION_MS) * scale
    const owned: Transition = { startedAt: performance.now(), duration }
    setTransition(owned)

    // Only clear what this burst set. Two surfaces can fire a burst, and a route
    // change away from an open popup unmounts the popup *and* starts a transition —
    // a cleanup that cleared unconditionally would cancel the route's glitch on its
    // way out, which is a one-frame bug that would be miserable to find later.
    const release = () => {
      if (getSceneState().transition === owned) setTransition(null)
    }

    if (reducedMotion) {
      const done = window.setTimeout(release, duration)
      return () => {
        window.clearTimeout(done)
        release()
      }
    }

    // The frame index is derived from elapsed time rather than counted by an
    // interval, for the same reason the scene derives its own from the shared
    // timestamp: a dropped frame should skip ahead, not stretch the burst. It also
    // keeps every setState inside a callback rather than in the effect body.
    const start = performance.now()
    let raf = 0

    const step = () => {
      const index = Math.floor((performance.now() - start) / (FRAME_MS * scale))
      if (index >= FRAMES) {
        setFrame(null)
        release()
        return
      }
      // React bails out when the value has not changed, so running at display rate
      // over a frame that lasts 36 ms costs nothing.
      setFrame(index)
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      setFrame(null)
      release()
    }
  }, [trigger, reducedMotion])

  if (frame === null) return null

  const intensity = ENVELOPE[Math.min(frame, ENVELOPE.length - 1)] ?? 0
  if (intensity <= 0) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      {/* A veil rather than a flash: the reference never goes white, and the frame
          is darker overall during the burst than either side of it. Kept low,
          because most of the darkness should come from black *bands* — a uniform
          scrim over the whole frame is a different effect and a duller one. */}
      <div className="absolute inset-0 bg-black" style={{ opacity: intensity * 0.3 }} />
      {buildBands(frame, intensity).map((band, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            top: `${band.top}%`,
            left: `${band.left}%`,
            width: `${band.width}%`,
            height: `${band.height}%`,
            background: band.colour,
            opacity: band.opacity,
            transform: `translateX(${band.shift}%)`,
          }}
        />
      ))}
    </div>
  )
}
