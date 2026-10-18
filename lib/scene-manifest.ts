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
  mask: AlphaMask
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
