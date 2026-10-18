'use client'

import { Assets, type Texture } from 'pixi.js'
import { useEffect, useState } from 'react'

import { decodeMask, type SceneManifest } from '@/lib/scene-manifest'

export type LoadedObject = {
  id: string
  texture: Texture
  /** Decoded alpha mask cells, one byte per cell. */
  cells: Uint8Array
}

export type SceneAssets = {
  manifest: SceneManifest
  layerTextures: Map<string, Texture>
  objects: Map<string, LoadedObject>
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

        const sources = [
          ...manifest.layers.map(pick),
          ...manifest.objects.map(pick),
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

        const objects = new Map<string, LoadedObject>()
        for (const object of manifest.objects) {
          const texture = loaded[pick(object)]
          if (!texture) continue
          objects.set(object.id, {
            id: object.id,
            texture,
            cells: decodeMask(object.mask),
          })
        }

        setState({ status: 'ready', assets: { manifest, layerTextures, objects } })
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

let webpSupport: Promise<boolean> | null = null

/** Decode a 1x1 WebP once per session and cache the answer. */
function supportsWebP(): Promise<boolean> {
  webpSupport ??= new Promise<boolean>((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image.width === 1)
    image.onerror = () => resolve(false)
    image.src =
      'data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='
  })
  return webpSupport
}
