'use client'

import { extend, useApplication, useTick } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'
import { useCallback, useEffect, useRef } from 'react'

import { bandBleed, bandOffset, sceneTransform } from '@/lib/scene-space'
import { BANDS_IN_DRAW_ORDER, type Band, type BandId } from './bands'
import { CameraRig } from './camera'
import { PLACEHOLDER_LAYERS, type PlaceholderLayer } from './placeholder-layers'

// Registers the display objects used below as JSX elements. Must run before render.
extend({ Container, Graphics })

/**
 * Identifies this module instance's mount. Incremented once per SceneStage mount so
 * that "the canvas survived navigation" can be asserted rather than assumed.
 */
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
export function SceneStage() {
  const { app, isInitialised } = useApplication()

  const rootRef = useRef<Container | null>(null)
  const bandRefs = useRef<Partial<Record<BandId, Container | null>>>({})
  const rigRef = useRef<CameraRig | null>(null)
  rigRef.current ??= new CameraRig()

  const mountIdRef = useRef<number | null>(null)
  mountIdRef.current ??= ++MOUNT_SEQUENCE

  // --- pointer ------------------------------------------------------------------
  // The handler stores coordinates and returns. All the work happens on the tick,
  // so input cost is constant no matter how fast events arrive.
  useEffect(() => {
    const rig = rigRef.current
    if (!rig) return

    const onPointerMove = (event: PointerEvent) => {
      rig.setPointer(event.clientX, event.clientY, window.innerWidth, window.innerHeight)
    }

    // Pointer has left the window entirely: ease back to centre rather than holding
    // wherever it was last seen.
    const onPointerOut = (event: PointerEvent) => {
      if (event.relatedTarget === null) rig.recentre()
    }

    const onBlur = () => rig.recentre()

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
  useEffect(() => {
    const rig = rigRef.current
    if (!rig) return

    const query = window.matchMedia('(prefers-reduced-motion: reduce)')

    const apply = () => {
      rig.reducedMotion = query.matches
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

      rig.update(ticker.deltaMS / 1000)

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
    },
    [app],
  )

  useTick({ callback: onTick, isEnabled: isInitialised })

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
    }

    return () => {
      delete (window as unknown as { __scene?: unknown }).__scene
    }
  }, [app, isInitialised])

  const setBandRef = useCallback(
    (id: BandId) => (container: Container | null) => {
      bandRefs.current[id] = container
    },
    [],
  )

  return (
    <pixiContainer ref={rootRef} label="scene-root">
      {SCENE_BANDS.map(({ band, layers }) => (
        <pixiContainer key={band.id} ref={setBandRef(band.id)} label={`band:${band.id}`}>
          {layers.map((layer) => (
            <pixiGraphics key={layer.id} label={layer.id} draw={layer.draw} />
          ))}
        </pixiContainer>
      ))}
    </pixiContainer>
  )
}

/**
 * The scene tree, resolved once at module scope: bands back to front, each carrying
 * its layers in draw order with their `draw` callback already built.
 *
 * Built once rather than per render because @pixi/react re-runs a `draw` callback
 * whenever its identity changes, so rebuilding these closures on every React render
 * would redraw every rectangle for no reason.
 *
 * When the manifest arrives in Phase 2 this is the only thing that changes shape:
 * same grouping, textures instead of fills.
 */
const SCENE_BANDS: readonly { band: Band; layers: readonly SceneLayer[] }[] =
  BANDS_IN_DRAW_ORDER.map((band) => ({
    band,
    layers: PLACEHOLDER_LAYERS.filter((layer) => layer.band === band.id)
      .sort((a, b) => a.z - b.z)
      .map((layer) => ({ id: layer.id, draw: makeDrawLayer(layer, band.factor) })),
  }))

type SceneLayer = { id: string; draw: (graphics: Graphics) => void }

/**
 * Flat fill. Layers marked `bleed` are inflated by whatever the band's parallax
 * factor demands, so that panning cannot expose the band's edge; real art carries
 * that bleed in the exported file instead, and `bandBleed` is the number to author
 * against either way.
 */
function makeDrawLayer(layer: PlaceholderLayer, factor: number) {
  const bleed = layer.bleed ? bandBleed(factor) : { x: 0, y: 0 }

  return (graphics: Graphics) => {
    graphics.clear()
    graphics.rect(
      layer.rect.x - bleed.x,
      layer.rect.y - bleed.y,
      layer.rect.width + bleed.x * 2,
      layer.rect.height + bleed.y * 2,
    )
    graphics.fill(layer.colour)
  }
}
