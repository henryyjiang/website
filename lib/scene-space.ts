/**
 * Scene space — the only mapping between the fixed design canvas and the screen.
 *
 * Everything in the scene (layer art, hotspot rectangles, the character anchor) is
 * authored against a fixed 2560 x 1440 canvas and mapped to the viewport here.
 * Nothing in the scene may be positioned in viewport percentages: the old site did
 * that over an `object-fit: cover` background, and because percentages are relative
 * to the element while `cover` crops relative to aspect ratio, the two diverged and
 * the invisible hotspots slid off the furniture. Art and hit areas sharing one space
 * by construction makes that class of bug impossible.
 *
 * See docs/ARCHITECTURE.md § Scene coordinate space.
 */

export const SCENE_W = 2560
export const SCENE_H = 1440
export const SCENE_ASPECT = SCENE_W / SCENE_H

/**
 * Scale applied beyond cover, to create room to pan.
 *
 * Cover alone is not enough. The design canvas is exactly 16:9, so on a 16:9
 * viewport — 1920x1080 and 2560x1440, the two most common desktop sizes — cover
 * produces zero overflow and therefore zero pan. The scene would sit perfectly
 * still for most visitors, which is not the intent.
 *
 * So the scene is drawn slightly larger than the viewport and panned within the
 * margin that creates. The old site did the same thing with a 1.05 zoom; this is
 * that idea expressed where the rest of the geometry already lives, so the pan
 * range stays derivable rather than being a magic number in a mousemove handler.
 *
 * The cost is that roughly 4% of each edge is outside the viewport at the design
 * aspect. That is the overscan margin art should not put anything important in —
 * art/TEMPLATE.png marks it.
 */
export const OVERSCAN = 1.08

/**
 * The width below which the scene is framed rather than fitted.
 *
 * A phone is around 9:19.5 against a 16:9 canvas, so covering the whole canvas
 * crops away about three quarters of the room's width and leaves a vertical slice
 * of wall. Below this width the scene stops trying to be the whole room and frames
 * one part of it instead, and navigation moves to the nav rather than the objects —
 * which it can, because the nav was always the real one (docs/ARCHITECTURE.md).
 */
export const NARROW_WIDTH = 768

/**
 * The point of the canvas a narrow viewport puts in the middle of the screen.
 *
 * A point, not a rectangle, because the crop is not negotiable: the canvas has to
 * cover the viewport or its edges show, and covering a 9:19.5 phone with a 16:9
 * canvas means scaling to the canvas's *height*. That fixes how much is visible —
 * about 665 scene units wide on a 375 x 812 phone, a quarter of the room — and
 * leaves exactly one decision, which quarter. Framing a rectangle instead would
 * only have been a more complicated way of writing this point down, and a way to
 * ask for a crop that cannot be honoured.
 *
 * It sits right of the canvas centre, on the window and the city behind it, which
 * says "a room above a city" in one glance. The bed and the desk are at the far
 * edges and cannot both be in frame; the nav reaches them, so what is lost on a
 * phone is the hover, not the destination.
 *
 * `art/TEMPLATE.png` draws the slice this produces, so the composition can be
 * checked against it while it is being drawn rather than afterwards.
 */
export const FOCAL_POINT = { x: 1500, y: 760 } as const

/**
 * How the scene is currently sitting on the screen.
 *
 * `scale` and the origin describe the scene at camera centre; the camera is applied
 * on top of that, per band, by `bandOffset`.
 */
export type SceneTransform = {
  /** Cover scale: scene px -> screen px. */
  scale: number
  /** Screen position of scene (0, 0) with the camera centred. Negative under cover. */
  originX: number
  originY: number
  /**
   * Maximum camera travel from centre, in *scene* units. This is half the overflow
   * the cover scale produced, so a camera clamped to +/- 1 can never reveal an edge
   * of the 1.00 band. Reaches zero on its own as the viewport aspect approaches the
   * scene aspect — no aspect-ratio cutoff is needed.
   */
  panRangeX: number
  panRangeY: number
}

export function sceneTransform(viewportW: number, viewportH: number): SceneTransform {
  if (viewportW > 0 && viewportW < NARROW_WIDTH) return focalTransform(viewportW, viewportH)

  // Cover, not contain: the scene always fills the window and we pan within the
  // overflow — plus OVERSCAN, so that overflow exists even at the design aspect.
  const scale = Math.max(viewportW / SCENE_W, viewportH / SCENE_H) * OVERSCAN

  const overflowX = SCENE_W * scale - viewportW
  const overflowY = SCENE_H * scale - viewportH

  return {
    scale,
    originX: -overflowX / 2,
    originY: -overflowY / 2,
    // Floating point can make the non-binding axis fractionally negative; clamp at 0.
    panRangeX: Math.max(0, overflowX / 2 / scale),
    panRangeY: Math.max(0, overflowY / 2 / scale),
  }
}

/**
 * Frame the focal point instead of centring the canvas, and do not pan.
 *
 * Cover with no overscan, because overscan exists to create room to pan and there
 * is nothing here to pan with: a phone has no pointer to follow, and a scene that
 * drifts on its own is motion nobody asked for. Dropping it also buys back the 8%
 * of the slice it would have spent, which is worth more here than anywhere else.
 *
 * The clamp is what lets the focal point sit well away from the canvas centre
 * without the framing having to know how close to an edge it is: ask for whatever
 * centring you want, and the scene slides back just far enough that no edge of the
 * canvas comes into view.
 */
function focalTransform(viewportW: number, viewportH: number): SceneTransform {
  const scale = Math.max(viewportW / SCENE_W, viewportH / SCENE_H)

  const originX = clamp(viewportW / 2 - FOCAL_POINT.x * scale, viewportW - SCENE_W * scale, 0)
  const originY = clamp(viewportH / 2 - FOCAL_POINT.y * scale, viewportH - SCENE_H * scale, 0)

  return { scale, originX, originY, panRangeX: 0, panRangeY: 0 }
}

/**
 * What a narrow viewport of this size actually shows, in scene units.
 *
 * Exported so the drawing template can mark it rather than describe it, and so the
 * slice is a measurement both sides agree on instead of a number written twice.
 */
export function focalSlice(viewportW: number, viewportH: number): Rect {
  const transform = focalTransform(viewportW, viewportH)
  return {
    x: -transform.originX / transform.scale,
    y: -transform.originY / transform.scale,
    width: viewportW / transform.scale,
    height: viewportH / transform.scale,
  }
}

type Rect = { x: number; y: number; width: number; height: number }

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Normalised camera position. Each axis is -1..1, where +1 means "looking at the
 * right/bottom edge of the available overflow". Normalised rather than absolute so
 * that a resize can never leave the camera out of bounds: the clamp is structural.
 */
export type Camera = { x: number; y: number }

export const CAMERA_CENTRE: Camera = { x: 0, y: 0 }

/**
 * A band's offset, in scene units, for the current camera.
 *
 * Layers move *against* the camera — looking right slides the room left — and the
 * parallax factor scales the travel, so near things move more than far things.
 */
export function bandOffset(
  transform: SceneTransform,
  camera: Camera,
  factor: number,
): { x: number; y: number } {
  return {
    x: -camera.x * transform.panRangeX * factor,
    y: -camera.y * transform.panRangeY * factor,
  }
}

/**
 * Scene point -> screen point, for a given band. The same transform serves rendering
 * and hit testing, which is what keeps the billboard — the one hotspot in the
 * `skyline` band — hittable where it is actually drawn rather than where a
 * single-plane assumption would put it.
 */
export function sceneToScreen(
  transform: SceneTransform,
  camera: Camera,
  factor: number,
  sceneX: number,
  sceneY: number,
): { x: number; y: number } {
  const offset = bandOffset(transform, camera, factor)
  return {
    x: transform.originX + (sceneX + offset.x) * transform.scale,
    y: transform.originY + (sceneY + offset.y) * transform.scale,
  }
}

/** Inverse of `sceneToScreen`, for turning pointer coordinates into scene coordinates. */
export function screenToScene(
  transform: SceneTransform,
  camera: Camera,
  factor: number,
  screenX: number,
  screenY: number,
): { x: number; y: number } {
  const offset = bandOffset(transform, camera, factor)
  return {
    x: (screenX - transform.originX) / transform.scale - offset.x,
    y: (screenY - transform.originY) / transform.scale - offset.y,
  }
}

/**
 * How far past the design canvas a band must be drawn so that panning never exposes
 * its edge, in scene units.
 *
 * A band at factor f travels `panRange * f`, while the overflow that hides it is only
 * `panRange`. Bands at or below 1.00 are therefore covered by construction; a band
 * above 1.00 overshoots by `panRange * (f - 1)` and needs that much bleed. Since
 * `panRange` can never exceed half the design canvas, the worst case is bounded and
 * can be baked into the art rather than recomputed per viewport.
 *
 * This is the same remedy docs/ARCHITECTURE.md prescribes for the `skyline` bands
 * behind the window opening, applied to the near band for the opposite reason.
 */
export function bandBleed(factor: number): { x: number; y: number } {
  const overshoot = Math.max(0, factor - 1)
  return {
    x: (SCENE_W / 2) * overshoot,
    y: (SCENE_H / 2) * overshoot,
  }
}

/** Pointer position in CSS px -> normalised camera target, clamped to -1..1. */
export function pointerToCamera(
  pointerX: number,
  pointerY: number,
  viewportW: number,
  viewportH: number,
): Camera {
  const clamp = (v: number) => Math.min(1, Math.max(-1, v))
  return {
    x: clamp(viewportW > 0 ? (pointerX / viewportW) * 2 - 1 : 0),
    y: clamp(viewportH > 0 ? (pointerY / viewportH) * 2 - 1 : 0),
  }
}
