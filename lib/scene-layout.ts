/**
 * Scene geometry that both the app and the art tooling need to agree on.
 *
 * This exists so the window opening and the hotspot rectangles have exactly one
 * definition. The placeholder generator draws against it, the template PNG marks it
 * out for Henry to draw against, and the runtime hit-tests against it. Three
 * consumers, one source — if they ever disagree, hit areas drift off the art, which
 * is the exact failure the old site had.
 *
 * Everything here is in scene coordinates: the fixed 2560 x 1440 design canvas.
 * See docs/ARCHITECTURE.md § Scene coordinate space.
 */

import { OVERSCAN, SCENE_H, SCENE_W } from './scene-space.ts'

export type Rect = { x: number; y: number; width: number; height: number }

/**
 * The window opening — the hole in the room band that the city is seen through.
 *
 * It is a hole, not a pane: the room art carries transparency here and the sky and
 * skyline bands composite behind it. Nothing masks the skyline to this shape, and
 * nothing reads this rectangle at runtime — it is the region `art/TEMPLATE.png`
 * marks, taken from the transparent area of the room art itself. Henry's glass runs
 * the full width of the canvas and is divided by mullions, so this is the whole
 * glazed band rather than a single pane.
 */
export const WINDOW_OPENING: Rect = { x: 0, y: 110, width: 2560, height: 940 }

/**
 * How far past the window opening the background bands must be drawn.
 *
 * The sky and skyline move less than the room, so they slide *behind* the opening as
 * the camera pans. Drawn only to the opening's size they would expose their edges;
 * this is the margin that prevents it, and the number art should be authored
 * against (docs/DESIGN.md).
 */
export const BACKGROUND_BLEED = 0.15

/** The opening inflated by the bleed — the area background art must actually cover. */
export const BACKGROUND_SAFE: Rect = {
  x: WINDOW_OPENING.x - WINDOW_OPENING.width * BACKGROUND_BLEED,
  y: WINDOW_OPENING.y - WINDOW_OPENING.height * BACKGROUND_BLEED,
  width: WINDOW_OPENING.width * (1 + BACKGROUND_BLEED * 2),
  height: WINDOW_OPENING.height * (1 + BACKGROUND_BLEED * 2),
}

/**
 * Hotspot footprints — an authoring guide, not a runtime input.
 *
 * Nothing in the scene hit-tests against these. The real bounds and the real mask
 * are measured from the art at import time and travel in the manifest, so a redrawn
 * object brings its own hit area. These rectangles exist so `art/TEMPLATE.png` can
 * draw where each object currently sits, and they are kept in step with the art by
 * reading them off an import rather than by hand-authoring a position.
 *
 * The billboard's footprint sits inside the window opening on purpose — it is the
 * one hotspot in the background band, so it is seen through the glass and travels at
 * the skyline's parallax factor, not the room's.
 */
export const HOTSPOT_RECTS = {
  desk: { x: 1810, y: 710, width: 750, height: 455 },
  bed: { x: 0, y: 840, width: 950, height: 445 },
  billboard: { x: 135, y: 225, width: 1260, height: 785 },
} as const satisfies Record<string, Rect>

export type HotspotId = keyof typeof HOTSPOT_RECTS

export const SCENE_BOUNDS: Rect = { x: 0, y: 0, width: SCENE_W, height: SCENE_H }

/**
 * The region that is on screen no matter where the camera is pointed.
 *
 * The scene is drawn slightly larger than the viewport so there is room to pan
 * (OVERSCAN in lib/scene-space.ts), and the camera then moves within that margin.
 * Content outside this rectangle is visible only some of the time, and content
 * outside the canvas edge by more than the margin is never visible at all.
 *
 * Derived rather than guessed: at the design aspect the camera travels +/- the
 * overscan margin, so the always-visible region is the canvas inset by twice that
 * on each axis. Anything that must always be seen — the hotspot objects especially
 * — belongs inside it. art/TEMPLATE.png draws it.
 */
const OVERSCAN_MARGIN_X = (SCENE_W * (1 - 1 / OVERSCAN)) / 2
const OVERSCAN_MARGIN_Y = (SCENE_H * (1 - 1 / OVERSCAN)) / 2

export const SAFE_AREA: Rect = {
  x: OVERSCAN_MARGIN_X * 2,
  y: OVERSCAN_MARGIN_Y * 2,
  width: SCENE_W - OVERSCAN_MARGIN_X * 4,
  height: SCENE_H - OVERSCAN_MARGIN_Y * 4,
}
