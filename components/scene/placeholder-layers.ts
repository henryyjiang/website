/**
 * Phase 1 placeholder layers: flat rectangles in scene coordinates, one list per band.
 *
 * These are deliberately crude. Placeholder art that is obviously placeholder cannot
 * quietly harden into a design decision (docs/ROADMAP.md), and the point of this
 * phase is to prove the transform and the camera, not to look like anything.
 *
 * The shape of this list is the shape of the real one. In Phase 2 these entries are
 * replaced by `public/scene/manifest.json`, generated from the `art/` inbox — same
 * band and z fields, with `src` in place of `colour`. Nothing downstream of here
 * knows where the list came from, so that swap touches this file and no component.
 */

import { SCENE_H, SCENE_W } from '@/lib/scene-space'
import type { BandId } from './bands'

export type PlaceholderLayer = {
  id: string
  band: BandId
  /** Draw order within the band, back to front. */
  z: number
  colour: number
  /** Scene-space rectangle. */
  rect: { x: number; y: number; width: number; height: number }
  /**
   * True for a layer that is responsible for covering its whole band, rather than
   * being an object sitting inside it. Those get inflated by `bandBleed(factor)` at
   * render time; bands above 1.00 travel further than the overflow that hides them,
   * so without it the near band's edge slides into view at the extremes of a pan.
   */
  bleed?: boolean
}

/** The window opening: a hole in the room band that the city is seen through. */
export const WINDOW_OPENING = { x: 420, y: 160, width: 1720, height: 1040 } as const

const W = WINDOW_OPENING

export const PLACEHOLDER_LAYERS: readonly PlaceholderLayer[] = [
  // --- sky, 0.10 -----------------------------------------------------------------
  { id: 'sky-fill', band: 'sky', z: 0, colour: 0x13203c, rect: { x: 0, y: 0, width: SCENE_W, height: SCENE_H } },

  // --- skyline, 0.30 -------------------------------------------------------------
  // Blocky stand-ins for the city. Given distinct heights so the band's own travel
  // is readable, not just its travel relative to the room.
  { id: 'skyline-block-a', band: 'skyline', z: 0, colour: 0x24395c, rect: { x: 220, y: 620, width: 300, height: 820 } },
  { id: 'skyline-block-b', band: 'skyline', z: 0, colour: 0x2c4468, rect: { x: 600, y: 440, width: 240, height: 1000 } },
  { id: 'skyline-block-c', band: 'skyline', z: 0, colour: 0x1e3151, rect: { x: 1500, y: 560, width: 280, height: 880 } },
  { id: 'skyline-block-d', band: 'skyline', z: 0, colour: 0x2a4064, rect: { x: 1900, y: 700, width: 340, height: 740 } },

  // The skyscraper carrying the billboard. The billboard is the one hotspot that
  // lives in the background band, so it must parallax with the city, not the room
  // (docs/DESIGN.md). Hotspots themselves are Phase 2; this is just its surface.
  { id: 'skyline-tower', band: 'skyline', z: 10, colour: 0x35507a, rect: { x: 1000, y: 260, width: 420, height: 1180 } },
  { id: 'skyline-billboard', band: 'skyline', z: 20, colour: 0x8a7fd4, rect: { x: 1040, y: 360, width: 340, height: 220 } },

  // --- room, 1.00 ----------------------------------------------------------------
  // The interior is drawn as a frame around the opening rather than a filled
  // rectangle with a hole cut in it: four flat rects need no path operations and
  // leave the opening genuinely empty, so the bands behind it composite through.
  { id: 'room-wall-above', band: 'room', z: 0, colour: 0x6b4f3a, rect: { x: 0, y: 0, width: SCENE_W, height: W.y } },
  { id: 'room-wall-below', band: 'room', z: 0, colour: 0x5e4433, rect: { x: 0, y: W.y + W.height, width: SCENE_W, height: SCENE_H - (W.y + W.height) } },
  { id: 'room-wall-left', band: 'room', z: 0, colour: 0x664a36, rect: { x: 0, y: W.y, width: W.x, height: W.height } },
  { id: 'room-wall-right', band: 'room', z: 0, colour: 0x664a36, rect: { x: W.x + W.width, y: W.y, width: SCENE_W - (W.x + W.width), height: W.height } },

  // Window mullions, so the glass reads as glass and the room band has detail
  // moving at 1.00 against the city behind it.
  { id: 'room-mullion-a', band: 'room', z: 10, colour: 0x7a5b43, rect: { x: 990, y: W.y, width: 26, height: W.height } },
  { id: 'room-mullion-b', band: 'room', z: 10, colour: 0x7a5b43, rect: { x: 1560, y: W.y, width: 26, height: W.height } },

  // Stand-ins for the two room-band hotspot objects. Positions are a guess and will
  // be set properly against real art in Phase 2.
  { id: 'room-desk', band: 'room', z: 20, colour: 0x9c6f4a, rect: { x: 1680, y: 1000, width: 620, height: 200 } },
  { id: 'room-easel', band: 'room', z: 20, colour: 0xa8864f, rect: { x: 260, y: 900, width: 300, height: 300 } },

  // --- near, 1.15 ----------------------------------------------------------------
  // Foreground clutter. Extends past the canvas on purpose: see bandBleed().
  { id: 'near-floor', band: 'near', z: 0, colour: 0x2e211c, rect: { x: 0, y: 1300, width: SCENE_W, height: 140 }, bleed: true },
]
