/**
 * The scene manifest: the contract between the `art/` inbox and the renderer.
 *
 * `npm run art` walks the inbox and writes `public/scene/manifest.json` to this
 * shape. The renderer reads it and never looks at `art/`. These types are shared by
 * both sides so the generator and the consumer cannot drift apart.
 *
 * Why generated rather than hand-written: a layer's parallax band comes from which
 * folder its file is in and its draw order from its filename prefix, so adding a
 * layer is dropping a file, reordering is a rename, and changing depth is moving a
 * file between folders. No component changes. See art/README.md.
 */

import type { BandId } from '../components/scene/bands.ts'

/** Current manifest format. Bumped if the shape changes incompatibly. */
export const MANIFEST_VERSION = 1

export type ManifestRect = { x: number; y: number; width: number; height: number }

/**
 * Four corners, clockwise from top-left, in scene units.
 *
 * Named `x0..x3` rather than `tl`/`tr`/… because that is the shape Pixi's
 * `PerspectiveMesh` takes, and a conversion step between the manifest and the mesh
 * would be a place for two corners to get swapped.
 */
export type ManifestQuad = {
  x0: number
  y0: number
  x1: number
  y1: number
  x2: number
  y2: number
  x3: number
  y3: number
}

export type ManifestImage = {
  /** Primary source, WebP. Path under public/, so browser-absolute. */
  src: string
  /** PNG fallback at the same pixels, for anywhere WebP is unavailable. */
  fallback: string
  width: number
  height: number
}

export type ManifestLayer = ManifestImage & {
  /** Derived from the filename, minus the ordering prefix. */
  id: string
  band: BandId
  /** Draw order within the band, from the filename's `NN-` prefix. */
  z: number
}

/**
 * A 1-bit alpha mask over the whole design canvas, downsampled by `scale`.
 *
 * This is what makes hit testing alpha-accurate without the runtime decoding full
 * resolution art: a rectangle around a desk catches the empty air above it, and a
 * hover glow that triggers off-object feels broken. At scale 8 the whole canvas is
 * 320 x 180 bits — 7.2 KB packed, under 10 KB as base64 — so it rides along in the
 * manifest rather than costing another request.
 *
 * `bits` is row-major, MSB first within each byte, base64 encoded.
 */
export type AlphaMask = {
  /** Downsample factor from scene units to mask cells. */
  scale: number
  width: number
  height: number
  bits: string
}

export type ManifestObject = ManifestImage & {
  /** Matches a hotspot id. */
  id: string
  band: BandId
  /** Draw order within the band. Objects sit in front of that band's layer art. */
  z: number
  /**
   * Tight bounds of the art's non-transparent pixels, in scene units — measured from
   * the art, not declared in code. Used as a cheap reject before consulting the mask,
   * and as the bounds for hover effects.
   */
  bounds: ManifestRect
  /**
   * The largest rectangle that fits inside the art's solid pixels, in scene units.
   *
   * What gets drawn *on* an object goes here: the billboard's live headlines sit in
   * this rect, so they follow the billboard when it is redrawn or moved instead of
   * needing a matching rectangle maintained by hand. Measured, like `bounds`.
   */
  inner: ManifestRect
  /**
   * The art's four extreme corners, clockwise from top-left.
   *
   * Meaningful for a flat surface drawn in perspective and ignored by everything
   * else. The billboard's carousel is a `PerspectiveMesh` pinned to these, so a
   * post image sits on the screen at the angle it was drawn rather than flat inside
   * a rectangle. See docs/ARCHITECTURE.md § Objects and surfaces.
   */
  quad: ManifestQuad
  /**
   * The largest rectangle on this object that **nothing drawn in front of it
   * covers**, in scene units.
   *
   * `inner` is the largest rectangle inside the art. That is the right box for
   * anything painted *onto* the object, and the wrong one for anything that has to
   * be read, because it knows nothing about what is between the object and the
   * viewer. The billboard is the case that proves it: it hangs outside the window,
   * the room's window frame draws over it in a nearer band, and a mullion runs down
   * x 306..349 for the full height of the screen. `inner` spans that mullion
   * happily — it is inside the billboard's own art — so a headline set at `inner`'s
   * left edge starts underneath the frame and loses its first letter.
   *
   * Measured the same way as `inner`, against the object's solid pixels minus every
   * layer in a band that draws after this one. So it follows the art on both sides:
   * move the billboard or redraw the window and the safe box moves with them.
   *
   * Equal to `inner` where nothing occludes the object, which is the usual case.
   */
  clear: ManifestRect
  mask: AlphaMask
  /**
   * A pre-blurred, saturation-boosted copy of this object's own art, at a quarter of
   * the canvas.
   *
   * The hover glow is this sprite behind the object with additive blending and an
   * eased alpha — not a `BlurFilter`, which would cost a render target and several
   * passes on every frame something is hovered. Blurring at import is also exactly
   * the recipe Henry paints with, which is why it sits in the scene rather than on
   * top of it. See docs/DESIGN.md § Lighting and glow.
   */
  glow: ManifestImage
}

export type ManifestCharacterFrame = {
  /** Index into `sheets`. */
  sheet: number
  /** Where this frame sits on its sheet, in sheet pixels. */
  x: number
  y: number
  width: number
  height: number
  /** Offset of the trimmed content within the original untrimmed frame. */
  offsetX: number
  offsetY: number
}

export type ManifestCharacter = {
  fps: number
  /** Where the character's feet sit, in scene coordinates. */
  anchor: { x: number; y: number }
  scale: number
  /** Untrimmed frame size, so trim offsets can be reapplied. */
  frameWidth: number
  frameHeight: number
  sheets: ManifestImage[]
  frames: ManifestCharacterFrame[]
}

export type SceneManifest = {
  version: number
  generatedAt: string
  scene: { width: number; height: number }
  layers: ManifestLayer[]
  objects: ManifestObject[]
  /** Null until a character animation is dropped into `art/character/`. */
  character: ManifestCharacter | null
}

/** Decode an `AlphaMask`'s packed bits into a byte-per-cell lookup. */
export function decodeMask(mask: AlphaMask): Uint8Array {
  const raw =
    typeof atob === 'function'
      ? Uint8Array.from(atob(mask.bits), (c) => c.charCodeAt(0))
      : // Node, for tests and tooling.
        new Uint8Array(Buffer.from(mask.bits, 'base64'))

  const cells = new Uint8Array(mask.width * mask.height)
  for (let i = 0; i < cells.length; i++) {
    cells[i] = (raw[i >> 3]! >> (7 - (i & 7))) & 1
  }
  return cells
}

/**
 * Is this scene point inside the object's art?
 *
 * Bounds first because it rejects most pointer positions with four comparisons, then
 * the mask for the actual shape.
 */
export function maskHitTest(
  object: Pick<ManifestObject, 'bounds' | 'mask'>,
  cells: Uint8Array,
  sceneX: number,
  sceneY: number,
): boolean {
  const b = object.bounds
  if (sceneX < b.x || sceneY < b.y || sceneX >= b.x + b.width || sceneY >= b.y + b.height) {
    return false
  }

  const { scale, width, height } = object.mask
  const cx = Math.floor(sceneX / scale)
  const cy = Math.floor(sceneY / scale)
  if (cx < 0 || cy < 0 || cx >= width || cy >= height) return false

  return cells[cy * width + cx] === 1
}
