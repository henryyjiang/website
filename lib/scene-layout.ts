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
 * The window opening — a hole in the room band that the city is seen through.
 *
 * It is a hole, not a pane: the room art carries transparency here and the sky and
 * skyline bands composite behind it. Nothing masks the skyline to this shape.
 */
export const WINDOW_OPENING: Rect = { x: 420, y: 160, width: 1720, height: 1040 }

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
 * Hotspot footprints.
 *
 * These are the *outer bounds* of each clickable object, used to place the object art
 * and to bound the hit test. Within these bounds the actual hit test is per-pixel
 * against the art's alpha, so a rectangle around an irregular object does not catch
 * the empty air near it.
 *
 * The billboard's bounds sit inside the window opening on purpose — it is the one
 * hotspot in the background band, so it is seen through the glass and travels at the
 * skyline's parallax factor, not the room's.
 */
export const HOTSPOT_RECTS = {
  desk: { x: 1560, y: 880, width: 760, height: 360 },
  art: { x: 210, y: 820, width: 420, height: 420 },
  billboard: { x: 1020, y: 340, width: 380, height: 250 },
} as const satisfies Record<string, Rect>

/**
 * The clear area on the billboard where update headlines are drawn.
 *
 * Defined here so the art and the text agree: the billboard art leaves this region
 * empty and the renderer draws `content/updates.ts` into it. Painting headlines into
 * the art would mean re-exporting the billboard every time an update is posted.
 */
export const BILLBOARD_TEXT_AREA: Rect = {
  x: HOTSPOT_RECTS.billboard.x + 24,
  y: HOTSPOT_RECTS.billboard.y + 24,
  width: HOTSPOT_RECTS.billboard.width - 48,
  height: HOTSPOT_RECTS.billboard.height - 90,
}

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
