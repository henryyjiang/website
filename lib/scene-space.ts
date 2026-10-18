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
  // Cover, not contain: the scene always fills the window and we pan within the overflow.
  const scale = Math.max(viewportW / SCENE_W, viewportH / SCENE_H)

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
