'use client'

import { usePathname } from 'next/navigation'

import { GlitchBurst } from './glitch'

/**
 * The glitch on a route change.
 *
 * All of the effect — the anatomy, the stepped frames, the clock the scene reads —
 * is in `glitch.tsx`, because the Art popup fires the same burst when it opens over
 * a piece (docs/DESIGN.md § Panel interiors). What is left here is the one thing
 * that is specific to routing: the path is the destination, so changing it is what
 * counts as arriving somewhere.
 *
 * Mounted once in the root layout, beside the scene it glitches with.
 */
export function RouteTransition() {
  return <GlitchBurst trigger={usePathname()} />
}
