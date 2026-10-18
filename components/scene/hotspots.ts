/**
 * The three hotspots, in scene coordinates.
 *
 * This table is the shared source for both halves of the deliberate duplication: the
 * Pixi hit areas and the hidden DOM nav. Keeping one list is what stops the two
 * drifting apart as the art is redrawn.
 *
 * `band` matters as much as `rect` — the billboard is the one hotspot in the
 * background, so its hit area must travel at the skyline's parallax factor rather
 * than assume a single plane (docs/DESIGN.md § The three hotspots).
 *
 * Phase 1 defines the table; Phase 2 gives it hover, glow and alpha-accurate hit
 * testing, and sets the rectangles against real art. The numbers here match the
 * placeholder blocks and are expected to change.
 */

import type { BandId } from './bands'

export type Hotspot = {
  id: 'desk' | 'art' | 'billboard'
  label: string
  href: string
  band: BandId
  rect: { x: number; y: number; width: number; height: number }
}

export const HOTSPOTS: readonly Hotspot[] = [
  {
    id: 'desk',
    label: 'Desk — software and AI research',
    href: '/desk',
    band: 'room',
    rect: { x: 1680, y: 1000, width: 620, height: 200 },
  },
  {
    id: 'art',
    label: 'Easel — drawing portfolio',
    href: '/art',
    band: 'room',
    rect: { x: 260, y: 900, width: 300, height: 300 },
  },
  {
    id: 'billboard',
    label: 'Billboard — recent updates',
    href: '/updates',
    band: 'skyline',
    rect: { x: 1040, y: 360, width: 340, height: 220 },
  },
]
