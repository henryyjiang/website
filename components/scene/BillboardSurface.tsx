'use client'

import { extend, useApplication } from '@pixi/react'
import {
  Assets,
  BlurFilter,
  Container,
  PerspectiveMesh,
  Rectangle,
  RenderTexture,
  Sprite,
  Text,
  Texture,
} from 'pixi.js'
import { useEffect, useMemo, useRef, useState } from 'react'

import { BILLBOARD_COUNT, POSTS } from '@/content/posts'
import { byDateDesc, type Post } from '@/content/types'
import { imageForPost } from '@/lib/content-images'
import type { ManifestQuad, ManifestRect } from '@/lib/scene-manifest'
import { DEFAULT_PALETTE, hex, PALETTES } from '@/lib/theme'
import { supportsWebP } from './useSceneAssets'

extend({ Container, Sprite, Text })

/** How long each post holds before the next one. */
const DWELL_MS = 4500

/**
 * Inset from the billboard's largest solid rectangle to the text's own box.
 *
 * Used only by a post with no image, which is set on the bare surface. The surface is
 * drawn in perspective, so its inner rect touches the sloping top and bottom edges at
 * exactly one point each; a margin keeps the headline off that pinch, and being a
 * fraction rather than a pixel count it survives the billboard being redrawn.
 */
const INSET = 0.08

/** Type size as a fraction of the panel height, for a headline on the bare surface. */
const TEXT_SCALE = 0.13

/**
 * The headline's outline, in scene units, for a headline over an image.
 *
 * A headline over a photograph needs its own ground — the surface is no longer the
 * pale peach the near-black type was chosen against, it is whatever the post's image
 * happens to be. The obvious answer is a dark bar along the bottom of the screen,
 * and it was the first thing tried; it does not survive this room. **The bottom
 * corners of the billboard are behind the bed**, because the billboard is outside
 * the window and the furniture is in front of it, so a caption bar there is half
 * eaten by a duvet. The top is no safer: the window frame crosses it.
 *
 * So the type stays where it has always been, centred on the surface, where it is
 * demonstrably clear of the room, and carries its ground with it as an outline.
 * Which also leaves the image unobscured, where a bar across the middle of it
 * would not.
 */
const TEXT_STROKE = 8

/**
 * Vertices per axis in the projection mesh.
 *
 * The perspective is computed per vertex and interpolated between, so too few
 * stretches the texture across the slope. Ten is Pixi's own default and is plenty for
 * a surface this close to rectangular; the cost is a 10x10 grid of triangles, once.
 */
const MESH_VERTICES = 10

/**
 * The glow behind the projected image, in scene units and at bake-like settings.
 *
 * Same recipe as the hover glow — Henry's Clip Studio one, blur a copy and put it
 * underneath — but the content changes every few seconds, so this one is rendered
 * into a texture per slide rather than baked by `npm run art`. Once every 4.5
 * seconds, never per frame (docs/ARCHITECTURE.md § Performance policy).
 *
 * `SPREAD` is the lesson from the object glow, in a new place: Henry drew a black
 * frame roughly 90 scene units wide around the lit surface, and a falloff longer than
 * that lights the whole frame evenly, which reads as a rectangle drawn around the
 * billboard rather than as light coming off it. The falloff has to finish inside the
 * frame, so the margin is the frame's width and the blur is sized to fade out well
 * within it.
 */
const GLOW_SPREAD = 90
const GLOW_DOWNSCALE = 4
const GLOW_BLUR = 9
const GLOW_ALPHA = 0.55

type Slide = { post: Post; src: string | null; fallback: string | null }

/**
 * The billboard's live surface: the newest posts, projected onto the real screen.
 *
 * Three things are happening here, and they are one thing to a reader: the post's
 * image is **projected onto the billboard's four measured corners**, so it sits at
 * the angle Henry drew the screen at rather than flat inside it; a blurred copy of
 * that image **spills out behind** as the screen's own light; and the headline is
 * drawn over it.
 *
 * **The image is the one belonging to whatever the post points at** — a project's
 * screenshot, a drawing, a video's thumbnail — in its saturated `lit` encoding. A
 * post has no picture of its own (`lib/content-images.ts`), and a photograph at its
 * own saturation pasted onto a screen in a neon city reads as a picture hung on a
 * wall (docs/DESIGN.md § The billboard).
 *
 * The corners come from the manifest, measured off the art at import. Redrawing the
 * billboard moves the carousel with it and takes no code and no export.
 *
 * Everything in the canvas here is decorative duplication: `/updates` lists the same
 * posts as DOM text, which is the accessible copy (docs/DESIGN.md § Accessibility).
 */
export function BillboardSurface({
  area,
  quad,
  reducedMotion,
}: {
  /** The billboard's measured inner rect — where a bare headline sits. */
  area: ManifestRect
  /** Its four measured corners, clockwise from top-left. Where the image goes. */
  quad: ManifestQuad
  reducedMotion: boolean
}) {
  const { app, isInitialised } = useApplication()

  const slides = useMemo<Slide[]>(
    () =>
      byDateDesc(POSTS)
        .slice(0, BILLBOARD_COUNT)
        .map((post) => {
          // The saturated copy, which is the only reason `lit` is baked. A post
          // whose target has no picture — or which points nowhere — shows as a
          // headline on the unlit surface, which is an ordinary state.
          const lit = imageForPost(post)?.lit ?? null
          return { post, src: lit?.src ?? null, fallback: lit?.fallback ?? null }
        }),
    [],
  )

  const [index, setIndex] = useState(0)
  const [textures, setTextures] = useState<Map<string, Texture>>(new Map())

  /*
   * Pixi measures a font when it constructs a `Text` and never re-measures, so text
   * built before Rajdhani has arrived is laid out in the fallback and silently stays
   * wrong — the DOM reflows when the webfont lands and the canvas does not. Waiting
   * on `document.fonts.ready` is the whole fix (docs/ARCHITECTURE.md § Fonts in the
   * canvas). It resolves immediately on a warm cache, so this costs a render only on
   * the visit where it matters.
   */
  const [fontReady, setFontReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void document.fonts.ready.then(() => {
      if (!cancelled) setFontReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // The post images are content rather than scene art — a different inbox, a
  // different manifest, resolved at build time — so they are not in the scene's
  // asset load and are fetched here. Three images, once.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const webp = await supportsWebP()
      const wanted = new Map<string, string>()
      for (const slide of slides) {
        const url = webp ? slide.src : slide.fallback
        if (url) wanted.set(slide.post.slug, url)
      }
      if (wanted.size === 0 || cancelled) return

      const loaded = (await Assets.load([...wanted.values()])) as Record<string, Texture>
      if (cancelled) return

      const next = new Map<string, Texture>()
      for (const [slug, url] of wanted) {
        const texture = loaded[url]
        if (texture) next.set(slug, texture)
      }
      setTextures(next)
    })()

    return () => {
      cancelled = true
    }
  }, [slides])

  // Not on the ticker: this changes every few seconds, not every frame, and a
  // setInterval that React owns is the honest way to express that. The ticker is for
  // things that move.
  useEffect(() => {
    if (reducedMotion || slides.length <= 1) return

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, DWELL_MS)

    return () => clearInterval(timer)
  }, [reducedMotion, slides.length])

  const geometry = useMemo(() => quadGeometry(quad), [quad])

  // Cropped to fill the screen rather than fitted inside it: a billboard with
  // letterboxing on it is a billboard showing a video player. Cropping is done by
  // moving the texture's frame, so no pixels are copied and the source stays shared.
  const cropped = useMemo(() => {
    const map = new Map<string, Texture>()
    for (const [slug, texture] of textures) {
      map.set(slug, cropToFill(texture, geometry.aspect))
    }
    return map
  }, [textures, geometry.aspect])

  const slide = slides[reducedMotion ? 0 : index % slides.length]
  const texture = slide ? (cropped.get(slide.post.slug) ?? null) : null

  const meshHost = useRef<Container | null>(null)
  const meshRef = useRef<PerspectiveMesh | null>(null)
  const glowRef = useRef<Sprite | null>(null)
  const glowTexture = useRef<RenderTexture | null>(null)

  // --- the projection -----------------------------------------------------------
  // Imperative because `PerspectiveMesh` takes its corners through a constructor and
  // `setCorners`, not as properties the bridge could set — and because the mesh is
  // one object whose texture changes, not one per slide.
  useEffect(() => {
    const host = meshHost.current
    if (!host) return

    if (!texture) {
      meshRef.current?.destroy()
      meshRef.current = null
      host.removeChildren()
      return
    }

    const corners = [
      quad.x0,
      quad.y0,
      quad.x1,
      quad.y1,
      quad.x2,
      quad.y2,
      quad.x3,
      quad.y3,
    ] as const

    if (meshRef.current) {
      meshRef.current.texture = texture
      // After the texture, because assigning one rebuilds the geometry from the
      // texture's dimensions and would otherwise undo the projection.
      meshRef.current.setCorners(...corners)
      return
    }

    const mesh = new PerspectiveMesh({
      texture,
      verticesX: MESH_VERTICES,
      verticesY: MESH_VERTICES,
      x0: quad.x0,
      y0: quad.y0,
      x1: quad.x1,
      y1: quad.y1,
      x2: quad.x2,
      y2: quad.y2,
      x3: quad.x3,
      y3: quad.y3,
    })

    meshRef.current = mesh
    host.addChild(mesh)
  }, [texture, quad])

  useEffect(
    () => () => {
      meshRef.current?.destroy()
      meshRef.current = null
    },
    [],
  )

  // --- the light it throws ------------------------------------------------------
  // One render texture for the life of the component, re-rendered when the slide
  // changes. Allocating a new one per slide would churn a GPU target every few
  // seconds for a picture of the same size.
  useEffect(() => {
    if (!isInitialised) return

    const width = Math.round((geometry.bounds.width + GLOW_SPREAD * 2) / GLOW_DOWNSCALE)
    const height = Math.round((geometry.bounds.height + GLOW_SPREAD * 2) / GLOW_DOWNSCALE)
    const target = RenderTexture.create({ width, height, antialias: false })
    glowTexture.current = target

    return () => {
      glowTexture.current = null
      target.destroy(true)
    }
  }, [isInitialised, geometry.bounds.width, geometry.bounds.height])

  useEffect(() => {
    const sprite = glowRef.current
    const target = glowTexture.current
    if (!sprite || !target || !isInitialised) return

    if (!texture) {
      sprite.visible = false
      return
    }

    // Inset inside the target by the margin, so the blur has somewhere to spread
    // instead of being clipped at the texture's edge — a clipped glow has a straight
    // edge, which is the one thing it must not have.
    const margin = GLOW_SPREAD / GLOW_DOWNSCALE
    const source = new Sprite(texture)
    source.position.set(margin, margin)
    source.width = geometry.bounds.width / GLOW_DOWNSCALE
    source.height = geometry.bounds.height / GLOW_DOWNSCALE
    source.filters = [new BlurFilter({ strength: GLOW_BLUR, quality: 4 })]

    const stage = new Container()
    stage.addChild(source)
    app.renderer.render({ container: stage, target, clear: true })
    stage.destroy({ children: true })

    sprite.texture = target
    sprite.position.set(
      geometry.bounds.x - GLOW_SPREAD,
      geometry.bounds.y - GLOW_SPREAD,
    )
    sprite.scale.set(GLOW_DOWNSCALE)
    sprite.alpha = GLOW_ALPHA
    sprite.visible = true
  }, [app, isInitialised, texture, geometry.bounds])

  if (!slide || area.width <= 0 || area.height <= 0 || !fontReady) return null

  const palette = PALETTES[DEFAULT_PALETTE]

  // A bare surface keeps the headline centred on it in near-black, because the
  // surface Henry painted is a pale lit panel and that is the readable pairing.
  const panel = {
    x: area.x + area.width * INSET,
    y: area.y + area.height * INSET,
    width: area.width * (1 - INSET * 2),
    height: area.height * (1 - INSET * 2),
  }

  const fontSize = Math.round(panel.height * TEXT_SCALE)

  return (
    <pixiContainer label="billboard-surface">
      {/* Behind the image and on top of the billboard art, so the opaque image hides
          the bright middle of it and only the spill past the screen's edges shows —
          which is what light coming off a screen looks like. Additive, like the
          object glows and like the blooms painted into the city. */}
      <pixiSprite
        ref={glowRef}
        label="billboard:post-glow"
        texture={Texture.EMPTY}
        blendMode="add"
        visible={false}
      />

      <pixiContainer ref={meshHost} label="billboard:image" />

      <pixiText
        text={slide.post.title.toUpperCase()}
        x={panel.x + panel.width / 2}
        y={panel.y + panel.height / 2}
        anchor={0.5}
        resolution={2}
        style={{
          // The DOM's display face, named directly: the canvas cannot read a CSS
          // variable, so this is the one place the family is written twice. The
          // colours are not — they come from the same palette the DOM reads, so
          // changing DEFAULT_PALETTE re-tints the billboard with everything else.
          fontFamily: 'Rajdhani, system-ui, sans-serif',
          fontSize,
          fontWeight: '700',
          // Light type carrying its own ground over an image; near-black on the bare
          // peach surface, where the palette's light-on-dark pairing is the wrong way
          // round. The billboard is the one place on the site where the ground can be
          // either, which is why this is the one place the pairing is chosen at
          // runtime rather than settled in the theme.
          fill: hex(texture ? palette.text : palette.ground),
          stroke: texture
            ? { color: hex(palette.ground), width: TEXT_STROKE, join: 'round' }
            : undefined,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: panel.width,
          lineHeight: Math.round(fontSize * 1.1),
          letterSpacing: 2,
        }}
      />
    </pixiContainer>
  )
}

/**
 * What can be measured off the billboard's four corners.
 *
 * All of it is derived rather than declared, for the reason the corners themselves
 * are measured: the screen is Henry's art, and anything written down beside it goes
 * stale the first time he redraws it.
 */
function quadGeometry(quad: ManifestQuad) {
  const top = distance(quad.x0, quad.y0, quad.x1, quad.y1)
  const bottom = distance(quad.x3, quad.y3, quad.x2, quad.y2)
  const left = distance(quad.x0, quad.y0, quad.x3, quad.y3)
  const right = distance(quad.x1, quad.y1, quad.x2, quad.y2)

  const xs = [quad.x0, quad.x1, quad.x2, quad.x3]
  const ys = [quad.y0, quad.y1, quad.y2, quad.y3]

  return {
    /** Average width over average height: what the image is cropped to. */
    aspect: (top + bottom) / (left + right),
    bounds: {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    },
  }
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay)
}

/**
 * The centre of `texture`, at `aspect`, as a texture sharing the same source.
 *
 * Moving the frame rather than resampling: no pixels are copied, the GPU upload is
 * shared with every other use of that image, and switching slides costs an object
 * rather than a texture. The cost is the documented one — compose post images
 * full-bleed and roughly 16:9, because a tall image loses its top and bottom
 * (docs/CONTENT.md).
 */
function cropToFill(texture: Texture, aspect: number): Texture {
  const { width, height } = texture.frame
  const current = width / height

  const cropWidth = current > aspect ? height * aspect : width
  const cropHeight = current > aspect ? height : width / aspect

  return new Texture({
    source: texture.source,
    frame: new Rectangle(
      texture.frame.x + (width - cropWidth) / 2,
      texture.frame.y + (height - cropHeight) / 2,
      cropWidth,
      cropHeight,
    ),
  })
}
