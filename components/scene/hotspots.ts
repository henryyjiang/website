/**
 * The three hotspots: which object in the room leads where.
 *
 * The DOM half of the duplication is `components/nav/TopNav.tsx`, reading
 * `content/nav.ts` — a visible list of destinations rather than this list of
 * objects, because that is the useful shape for a nav and because it also carries
 * Home, which is not an object in the room.
 *
 * Note what is *not* here any more: the rectangles. Hit areas are measured from the
 * art's alpha at import time and arrive in the manifest, so a redrawn object brings
 * its own hit area with it. A rectangle declared here would be a second source of
 * truth that silently went stale the first time Henry moved the desk — which is
 * exactly how the old site's invisible buttons ended up off the furniture.
 *
 * `band` stays, because it is a design decision rather than a measurement: the
 * billboard is seen through the glass, so it travels at the skyline's parallax factor
 * (docs/DESIGN.md § The three hotspots). lib/scene-layout.ts still carries footprint
 * rectangles, but only as an authoring guide for the template and the placeholders.
 */

import type { BandId } from './bands'

export type Hotspot = {
  id: 'desk' | 'bed' | 'billboard'
  href: string
  band: BandId
}

export const HOTSPOTS: readonly Hotspot[] = [
  {
    id: 'desk',
    href: '/desk',
    band: 'room',
  },
  {
    // The object is a bed and the destination is the drawing portfolio, so the id
    // and the route differ on purpose: ids name what is in the room, because that
    // is what the art files are named after and what the hit test matches.
    id: 'bed',
    href: '/art',
    band: 'room',
  },
  {
    id: 'billboard',
    href: '/updates',
    band: 'skyline',
  },
]
