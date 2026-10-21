'use client'

import { Assets, Rectangle, Texture } from 'pixi.js'
import { useEffect, useState } from 'react'

import { isDrawnObject } from './hotspots'
import {
  decodeMask,
  type ManifestCharacter,
  type ManifestImage,
  type SceneManifest,
} from '@/lib/scene-manifest'

export type LoadedObject = {
  id: string
  /**
   * Null for an object that is measured but never drawn.
   *
   * The billboard is the only one: its screen is no longer painted into the city, so
   * the object exists to say where that screen is and the carousel fills it
   * (`components/scene/hotspots.ts` § `drawn`). Skipping the upload matters more than
   * it looks — an object's art is a full 2560 x 1440 frame, which is about 15 MB of
   * video memory each once decoded, however small the file is on disk.
   */
  texture: Texture | null
  /**
   * The pre-blurred copy that lights up on hover, at a quarter of the canvas.
   *
   * Drawn behind the object with additive blending, scaled back to full size. The
   * GPU's bilinear upscale costs nothing and is itself a blur, so a quarter-size
   * texture is indistinguishable from a full-size one once it has been blurred.
   *
   * Null alongside `texture`, and for the same reason.
   */
  glow: Texture | null
  /** Decoded alpha mask cells, one byte per cell. Always present: this is the hit area. */
  cells: Uint8Array
}

export type LoadedCharacter = {
  /** One texture per frame, in playback order, all pointing at the packed sheets. */
  frames: Texture[]
  fps: number
  /** Where the feet sit, in scene coordinates. */
  anchor: { x: number; y: number }
  scale: number
}

export type SceneAssets = {
  manifest: SceneManifest
  layerTextures: Map<string, Texture>
  objects: Map<string, LoadedObject>
  /** Null until an animation is dropped into `art/character/`. */
  character: LoadedCharacter | null
}

export type SceneAssetsState =
  | { status: 'loading' }
  | { status: 'ready'; assets: SceneAssets }
  | { status: 'error'; error: string }

/**
 * Fetch the manifest and load every texture it names.
 *
 * Textures go through `Assets.load`, which resolves *after* GPU upload. That is the
 * difference that matters: the old site guarded on `img.complete`, which reports
 * whether a resource downloaded and stays true even after the browser has discarded
 * the decoded bitmap — so the guard passed and the draw stalled. See
 * docs/ANIMATION.md.
 *
 * WebP is used where the browser supports it, with the PNG fallback otherwise. The
 * manifest carries both.
 */
export function useSceneAssets(): SceneAssetsState {
  const [state, setState] = useState<SceneAssetsState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch('/scene/manifest.json')
        if (!response.ok) {
          throw new Error(
            `manifest.json is missing (${response.status}). Run \`npm run art\`.`,
          )
        }

        const manifest = (await response.json()) as SceneManifest
        const webp = await supportsWebP()
        const pick = (image: { src: string; fallback: string }) =>
          webp ? image.src : image.fallback

        const drawnObjects = manifest.objects.filter((object) => isDrawnObject(object.id))

        const sources = [
          ...manifest.layers.map(pick),
          ...drawnObjects.map(pick),
          ...drawnObjects.map((object) => pick(object.glow)),
          ...(manifest.character?.sheets ?? []).map(pick),
        ]

        // One call, so Pixi batches the uploads rather than thrashing per texture.
        const loaded: Record<string, Texture> = sources.length
          ? await Assets.load(sources)
          : {}

        if (cancelled) return

        const layerTextures = new Map<string, Texture>()
        for (const layer of manifest.layers) {
          const texture = loaded[pick(layer)]
          if (texture) layerTextures.set(layer.id, texture)
        }

        // A measured-only object still gets an entry, because the entry is what makes
        // it clickable: hit testing reads `cells` and never the texture.
        const objects = new Map<string, LoadedObject>()
        for (const object of manifest.objects) {
          const drawn = isDrawnObject(object.id)
          const texture = drawn ? (loaded[pick(object)] ?? null) : null
          const glow = drawn ? (loaded[pick(object.glow)] ?? null) : null
          if (drawn && (!texture || !glow)) continue
          objects.set(object.id, {
            id: object.id,
            texture,
            glow,
            cells: decodeMask(object.mask),
          })
        }

        const character = manifest.character
          ? buildCharacter(manifest.character, loaded, pick)
          : null

        setState({
          status: 'ready',
          assets: { manifest, layerTextures, objects, character },
        })
      } catch (error) {
        if (cancelled) return
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}

/**
 * Cut one texture per frame out of the packed sheets.
 *
 * The frames were trimmed at pack time — transparent margins cost memory on the GPU
 * for nothing — so each one carries the offset it was trimmed from. `orig` restores
 * the untrimmed frame size and `trim` says where the kept pixels sit inside it,
 * which is how Pixi puts a trimmed frame back exactly where it was drawn. Without
 * both, a character whose arms swing outside their resting silhouette would jitter
 * frame to frame, which is the kind of bug that looks like bad animation rather
 * than bad code.
 *
 * Every frame shares its sheet's `source`, so a hundred frames is still one upload.
 */
function buildCharacter(
  spec: ManifestCharacter,
  loaded: Record<string, Texture>,
  pick: (image: ManifestImage) => string,
): LoadedCharacter | null {
  const sheets = spec.sheets.map((sheet) => loaded[pick(sheet)])
  const frames: Texture[] = []

  for (const frame of spec.frames) {
    const sheet = sheets[frame.sheet]
    if (!sheet) return null

    frames.push(
      new Texture({
        source: sheet.source,
        frame: new Rectangle(frame.x, frame.y, frame.width, frame.height),
        orig: new Rectangle(0, 0, spec.frameWidth, spec.frameHeight),
        trim: new Rectangle(frame.offsetX, frame.offsetY, frame.width, frame.height),
      }),
    )
  }

  if (frames.length === 0) return null

  return { frames, fps: spec.fps, anchor: spec.anchor, scale: spec.scale }
}

let webpSupport: Promise<boolean> | null = null

/**
 * Decode a 1x1 WebP once per session and cache the answer.
 *
 * Exported because the billboard loads its own textures — the post images are
 * content, not scene art, and arrive from a different manifest — and a second copy
 * of this test would be a second answer to the same question.
 */
export function supportsWebP(): Promise<boolean> {
  webpSupport ??= new Promise<boolean>((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image.width === 1)
    image.onerror = () => resolve(false)
    image.src =
      'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
  })
  return webpSupport
}
