/**
 * The three hotspots.
 *
 * This table is the shared source for both halves of the deliberate duplication: the
 * scene's pointer hit testing and the hidden DOM nav. Keeping one list is what stops
 * the two drifting apart as the art is redrawn.
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
  id: 'desk' | 'art' | 'billboard'
  /** Used by the DOM nav, so it is read aloud and seen on focus. */
  label: string
  href: string
  band: BandId
}

export const HOTSPOTS: readonly Hotspot[] = [
  {
    id: 'desk',
    label: 'Desk — software and AI research',
    href: '/desk',
    band: 'room',
  },
  {
    id: 'art',
    label: 'Easel — drawing portfolio',
    href: '/art',
    band: 'room',
  },
  {
    id: 'billboard',
    label: 'Billboard — recent updates',
    href: '/updates',
    band: 'skyline',
  },
]
