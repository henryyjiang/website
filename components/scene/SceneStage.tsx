'use client'

import { extend, useApplication, useTick } from '@pixi/react'
import { Container, Sprite, type Texture } from 'pixi.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { bandOffset, sceneTransform } from '@/lib/scene-space'
import { getSceneState, setHovered, type HotspotId } from '@/lib/store'
import { BANDS_IN_DRAW_ORDER, type Band, type BandId } from './bands'
import { BillboardText } from './BillboardText'
import { CameraRig } from './camera'
import { GLOW_SPRING, HotspotGlow } from './glow'
import { hitTest, inHitOrder, type HitTestable } from './hit-test'
import type { SceneAssets } from './useSceneAssets'

extend({ Container, Sprite })

let MOUNT_SEQUENCE = 0

/**
 * The contents of the Pixi application: a scaled root holding one container per
 * parallax band, driven by the camera rig on the ticker.
 *
 * The scene tree is declared in React, but nothing inside it is animated *through*
 * React. Per-frame values are written straight onto the display objects via refs in
 * `useTick`. Re-rendering React sixty times a second to move four containers would
 * be wasteful, and it would reintroduce the old site's bug in a new costume: the
 * rule is that whatever is written every frame is owned by the ticker alone.
 */
export function SceneStage({ assets }: { assets: SceneAssets }) {
  const { app, isInitialised } = useApplication()

  const rootRef = useRef<Container | null>(null)
  const bandRefs = useRef<Partial<Record<BandId, Container | null>>>({})
  const rigRef = useRef<CameraRig | null>(null)
  rigRef.current ??= new CameraRig()

  const mountIdRef = useRef<number | null>(null)
  mountIdRef.current ??= ++MOUNT_SEQUENCE

  // --- the scene tree, grouped by band ------------------------------------------
  // Layers and objects share a band container so they parallax together. Objects
  // always draw in front of their band's layer art, which is sorted for structurally
  // rather than by comparing their z values: a layer's z comes from a filename
  // prefix Henry types, and a layer with no prefix sorts last within its layers, so
  // a numeric comparison across the two kinds puts the city in front of the
  // billboard the moment a background file is dropped in unprefixed.
  const bandGroups = useMemo(() => {
    const { manifest, layerTextures, objects } = assets

    return BANDS_IN_DRAW_ORDER.map((band) => {
      const items: { id: string; texture: Texture; z: number; isObject: boolean }[] = []

      for (const layer of manifest.layers) {
        if (layer.band !== band.id) continue
        const texture = layerTextures.get(layer.id)
        if (texture) items.push({ id: layer.id, texture, z: layer.z, isObject: false })
      }

      for (const object of manifest.objects) {
        if (object.band !== band.id) continue
        const loaded = objects.get(object.id)
        if (loaded) {
          items.push({ id: object.id, texture: loaded.texture, z: object.z, isObject: true })
        }
      }

      items.sort((a, b) => Number(a.isObject) - Number(b.isObject) || a.z - b.z)
      return { band, items }
    })
  }, [assets])

  // --- hover state --------------------------------------------------------------
  const objectViews = useRef(new Map<HotspotId, HotspotGlow>())
  // Populated by the Pixi ref callbacks, which fire during commit — before the
  // effect below runs. Kept separate from the glow objects for exactly that reason.
  const objectSprites = useRef(new Map<HotspotId, Sprite | null>())

  useEffect(() => {
    const views = new Map<HotspotId, HotspotGlow>()

    for (const object of assets.manifest.objects) {
      if (!assets.objects.has(object.id)) continue
      views.set(object.id as HotspotId, new HotspotGlow(object))
    }

    objectViews.current = views

    return () => {
      for (const view of views.values()) view.destroy()
      objectViews.current = new Map()
    }
  }, [assets])

  const hitCandidates = useMemo<HitTestable[]>(() => {
    const candidates: HitTestable[] = []
    for (const object of assets.manifest.objects) {
      const loaded = assets.objects.get(object.id)
      if (loaded) candidates.push({ object, loaded })
    }
    return inHitOrder(candidates)
  }, [assets])

  // --- pointer ------------------------------------------------------------------
  // The handler stores coordinates and returns. All the work happens on the tick,
  // so input cost is constant no matter how fast events arrive.
  const pointerRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const rig = rigRef.current
    if (!rig) return

    const onPointerMove = (event: PointerEvent) => {
      rig.setPointer(event.clientX, event.clientY, window.innerWidth, window.innerHeight)
      pointerRef.current = { x: event.clientX, y: event.clientY }
    }

    // Pointer has left the window entirely: ease back to centre rather than holding
    // wherever it was last seen.
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) {
        rig.recentre()
        pointerRef.current = null
        setHovered(null)
      }
    }

    const onBlur = () => {
      rig.recentre()
      pointerRef.current = null
      setHovered(null)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerout', onPointerOut, { passive: true })
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // --- prefers-reduced-motion ---------------------------------------------------
  // Camera held at centre, parallax off. The scene stays fully navigable: panning is
  // decoration, never the only way to reach anything (docs/DESIGN.md).
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const rig = rigRef.current
    if (!rig) return

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')

    const apply = () => {
      rig.reducedMotion = query.matches
      // State rather than a ref, because BillboardText reads it during render to
      // decide whether to cycle. A ref read there would never trigger the re-render
      // that makes the change take effect.
      setReducedMotion(query.matches)
      if (query.matches) rig.jumpToCentre()
    }

    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [])

  // --- tab visibility -----------------------------------------------------------
  // Stop the ticker rather than letting it free-run and then correcting for the
  // elapsed time afterwards. The old site tried to correct; the right move is not to
  // accumulate. See docs/ANIMATION.md § Required tab-visibility handling.
  useEffect(() => {
    if (!isInitialised) return

    const onVisibilityChange = () => {
      if (document.hidden) {
        app.ticker.stop()
      } else {
        // The stored pointer position is stale after an absence of unknown length,
        // so drop it instead of easing from where the pointer used to be.
        rigRef.current?.recentre()
        pointerRef.current = null
        setHovered(null)
        app.ticker.start()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    // The tab may already have been hidden by the time the app initialised.
    onVisibilityChange()

    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [app, isInitialised])

  // --- the frame ----------------------------------------------------------------
  const onTick = useCallback(
    (ticker: { deltaMS: number }) => {
      const rig = rigRef.current
      const root = rootRef.current
      if (!rig || !root) return

      const dt = ticker.deltaMS / 1000
      rig.update(dt)

      // Recomputed per frame from the renderer's own size rather than tracked
      // through resize events: it is a handful of multiplications and it cannot go
      // stale against the canvas it is describing.
      const transform = sceneTransform(app.screen.width, app.screen.height)

      root.scale.set(transform.scale)
      root.position.set(transform.originX, transform.originY)

      for (const band of BANDS_IN_DRAW_ORDER) {
        const container = bandRefs.current[band.id]
        if (!container) continue
        const offset = bandOffset(transform, rig.current, band.factor)
        container.position.set(offset.x, offset.y)
      }

      // --- hover ------------------------------------------------------------
      // Hit tested here rather than in the pointer handler because it needs the
      // camera position, which only exists once the frame's easing has run.
      const pointer = pointerRef.current
      const overlayOpen = getSceneState().overlay !== null

      const hovered =
        pointer && !overlayOpen
          ? hitTest(hitCandidates, transform, rig.current, pointer.x, pointer.y)
          : null

      setHovered(hovered)

      // Exponential damping, same as the camera, so the glow cannot pop.
      const t = 1 - Math.exp(-GLOW_SPRING * Math.min(0.1, dt))

      for (const [id, view] of objectViews.current) {
        view.update(objectSprites.current.get(id), hovered === id ? 1 : 0, t)
      }
    },
    [app, hitCandidates],
  )

  useTick({ callback: onTick, isEnabled: isInitialised })

  // --- cursor -------------------------------------------------------------------
  // Driven from the store rather than written in the tick, so it is one DOM write
  // per hover change instead of one per frame.
  useEffect(() => {
    let last: HotspotId | null = null

    const check = () => {
      const { hovered } = getSceneState()
      if (hovered === last) return
      last = hovered
      document.body.style.cursor = hovered ? 'pointer' : ''
    }

    const interval = setInterval(check, 50)
    return () => {
      clearInterval(interval)
      document.body.style.cursor = ''
    }
  }, [])

  // --- dev handle ---------------------------------------------------------------
  // The claims this phase makes — one mount across navigation, the right parallax
  // differential, a ticker that actually stops — are all checkable, so expose what
  // is needed to check them instead of taking them on trust. Stripped from
  // production builds.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !isInitialised) return

    const w = window as unknown as { __scene?: unknown }
    w.__scene = {
      app,
      rig: rigRef.current,
      bands: bandRefs.current,
      transform: () => sceneTransform(app.screen.width, app.screen.height),
      mountId: mountIdRef.current,
      hitTest: (x: number, y: number) =>
        hitTest(
          hitCandidates,
          sceneTransform(app.screen.width, app.screen.height),
          rigRef.current?.current ?? { x: 0, y: 0 },
          x,
          y,
        ),
      state: getSceneState,
    }

    return () => {
      delete (window as unknown as { __scene?: unknown }).__scene
    }
  }, [app, isInitialised, hitCandidates])

  const setBandRef = useCallback(
    (id: BandId) => (container: Container | null) => {
      bandRefs.current[id] = container
    },
    [],
  )

  // Where the headlines go, measured from the billboard art at import rather than
  // declared next to it. No billboard in the manifest means no text to place.
  const billboardArea = useMemo(
    () => assets.manifest.objects.find((object) => object.id === 'billboard')?.inner ?? null,
    [assets],
  )

  const setObjectRef = useCallback(
    (id: string) => (sprite: Sprite | null) => {
      objectSprites.current.set(id as HotspotId, sprite)
    },
    [],
  )

  return (
    <pixiContainer ref={rootRef} label="scene-root">
      {bandGroups.map(({ band, items }) => (
        <pixiContainer key={band.id} ref={setBandRef(band.id)} label={`band:${band.id}`}>
          {items.map((item) => (
            <pixiSprite
              key={item.id}
              label={item.id}
              texture={item.texture}
              x={0}
              y={0}
              ref={item.isObject ? setObjectRef(item.id) : undefined}
            />
          ))}
          {band.id === 'skyline' && billboardArea && (
            <BillboardText area={billboardArea} reducedMotion={reducedMotion} />
          )}
        </pixiContainer>
      ))}
    </pixiContainer>
  )
}

export type { Band }
