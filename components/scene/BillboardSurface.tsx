'use client'

import { extend, useApplication } from '@pixi/react'
import {
  Assets,
  BlurFilter,
  ColorMatrixFilter,
  Container,
  PerspectiveMesh,
  Rectangle,
  RenderTexture,
  Sprite,
  Text,
  Texture,
} from 'pixi.js'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

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
 * The screen is drawn in perspective, so its inner rect touches the sloping top and
 * bottom edges at exactly one point each; a margin keeps the headline off that pinch,
 * and being a fraction rather than a pixel count it survives the billboard being
 * redrawn at a different size.
 */
const INSET = 0.08

/** Type size as a fraction of the panel height, so the headline scales with the art. */
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
 * The glow behind the projected image.
 *
 * Same recipe as the hover glow — Henry's Clip Studio one, blur a copy and put it
 * underneath — but the content changes every few seconds, so this one is rendered
 * into a texture per slide rather than baked by `npm run art`. Once every 4.5
 * seconds, never per frame (docs/ARCHITECTURE.md § Performance policy).
 *
 * **`BLUR` is the reach, and two other things have to follow it.** The blur is what
 * carries light away from the screen. Everything downstream only has to be wide
 * enough that the falloff has reached nothing before it runs out of room, because a
 * gaussian that gets cut off is cut off *square*, and a straight-edged glow is the
 * one thing this must never be.
 *
 * There are two places it can run out of room, and both bit. The render texture is
 * the obvious one, so `SPREAD` is derived from the blur rather than chosen. The
 * other is **the blur filter's own padding**, which Pixi sets to twice the strength
 * — and at two sigma a gaussian is still at 8% of full, so the filter was clipping
 * its own output to zero while it was plainly visible. That is the hard line: alpha
 * stepped 0 → 21 at exactly 32 texture pixels out, which is 2 × 16. It was there
 * before the glow was widened too, at 2 × 9, just dim enough to miss.
 *
 * So the tail length is one number, used in both places. At 3.5 sigma a gaussian is
 * at 0.02% — zero in eight bits — which is what makes the edge disappear rather than
 * merely get fainter.
 *
 * Widening it does *not* make it fainter, which is worth knowing because the hover
 * glow taught the opposite (docs/DESIGN.md § Lighting and glow). That lesson is about
 * blurring a *silhouette*, where a fixed amount of opacity gets spread thinner the
 * further it travels. This blurs a large filled rectangle, whose middle stays
 * saturated however far the edges are smeared, so a bigger sigma only stretches the
 * skirt outward — at 90 units past the screen, going from sigma 36 to sigma 64 takes
 * the glow from 0.6% of full to 8%. Reach and strength happen to move together here.
 */
const GLOW_BLUR = 16
const GLOW_DOWNSCALE = 4
const GLOW_TAIL = 3.5
const GLOW_SPREAD = Math.round(GLOW_BLUR * GLOW_DOWNSCALE * GLOW_TAIL)

/**
 * How hard the slide is brightened before it is blurred into the glow.
 *
 * **Opacity cannot do this job.** The glow is composited additively, and adding a
 * near-black image adds nothing however opaque it is — so a dark post simply did not
 * light the city, and turning the alpha up could not make it. What makes a dark image
 * emit is making the copy brighter, which is Henry's own instinct: take the dark
 * colours and raise them for the glow.
 *
 * How far is a question about the particular image, so it is answered per image
 * rather than picked once. `lit.luma` is the image's measured average brightness, and
 * the gain is whatever brings it to `GLOW_TARGET`, bounded at both ends: a neon
 * drawing is already there and gets `GLOW_BASE`, a mostly-black screenshot gets the
 * ceiling. The result is that every post throws roughly the same amount of light
 * regardless of how dark it happens to be, which is what a real screen does — its
 * backlight does not dim because the picture is dark.
 *
 * The ceiling is a ceiling because the lift is a multiply: it rescues dark pixels
 * and clips bright ones, and past a point an image stops being brightened and starts
 * being flattened into a white rectangle. Saturation goes on afterwards to put back
 * the colour that lifting takes out — the whole point is coloured light, and grey
 * light would read as a lamp behind the billboard rather than the billboard being on.
 *
 * All of these went up on 2026-10-21 when the glow was widened, because spreading
 * light over a larger area is the same light thinner: the halo reached further and
 * read as less. Brightness is what puts it back, and it is the only lever that can —
 * the sprite's alpha is already 0.6 at rest and capped at 1, and raising it would
 * spend the hover range instead (components/scene/hotspots.ts). The saturation went
 * up with it rather than separately: a bigger multiply clips more pixels, clipping
 * is what turns coloured light grey, and this is what pushes back.
 */
const GLOW_TARGET = 0.44
const GLOW_BASE = 1.7
const GLOW_MAX_GAIN = 9
const GLOW_SATURATE = 0.75

type Slide = { post: Post; src: string; fallback: string; luma: number }

/**
 * What the ticker needs to know about this surface, written straight to a ref.
 *
 * The billboard has two glows and only ever wants one: its baked one is a blurred
 * copy of the unlit screen, so while an image is projected over that screen the
 * building would throw peach light whatever the image is. The crossfade between them
 * has to happen on the frame clock, where every other glow is eased
 * (`components/scene/glow.ts`), so the alpha of the sprite below is not this
 * component's to set — it only says whether a slide is up and hands over the sprite.
 *
 * A ref rather than the store or a prop callback: it changes when a slide changes,
 * which is nothing React needs to re-render for, and SceneStage already reads
 * per-frame values this way.
 */
export type BillboardSurfaceState = { lit: boolean; glow: Sprite | null }

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
  stateRef,
}: {
  /** The billboard's measured inner rect — where a bare headline sits. */
  area: ManifestRect
  /** Its four measured corners, clockwise from top-left. Where the image goes. */
  quad: ManifestQuad
  reducedMotion: boolean
  /** Written, not read: what the ticker needs to drive the two glows. */
  stateRef: RefObject<BillboardSurfaceState>
}) {
  const { app, isInitialised } = useApplication()

  /*
   * The newest posts *that have a picture*, which is not the same as the newest
   * posts.
   *
   * It used to be. A post with no image showed its headline on the peach screen
   * Henry had painted into the city, which was a perfectly good unlit state. He
   * painted that screen out on 2026-10-21, once the projection was landing on the
   * right four corners — so what is behind the carousel now is the inside of the
   * billboard's frame, and a post with nothing to project would be a headline over
   * a hole. The blog still lists it; the billboard just has nothing to say about it.
   */
  const slides = useMemo<Slide[]>(
    () =>
      byDateDesc(POSTS)
        .flatMap((post) => {
          // The saturated copy, which is the only reason `lit` is baked.
          const lit = imageForPost(post)?.lit
          return lit ? [{ post, src: lit.src, fallback: lit.fallback, luma: lit.luma }] : []
        })
        .slice(0, BILLBOARD_COUNT),
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
        wanted.set(slide.post.slug, webp ? slide.src : slide.fallback)
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

  const slide = slides[reducedMotion ? 0 : index % slides.length] ?? null
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

    // Reported before the early return, so the ticker learns on the frame a slide
    // goes away rather than being left lighting the city with the last one.
    stateRef.current = { lit: texture !== null, glow: sprite }

    if (!texture || !slide) return

    // Inset inside the target by the margin, so the blur has somewhere to spread
    // instead of being clipped at the texture's edge — a clipped glow has a straight
    // edge, which is the one thing it must not have.
    const margin = GLOW_SPREAD / GLOW_DOWNSCALE
    const source = new Sprite(texture)
    source.position.set(margin, margin)
    source.width = geometry.bounds.width / GLOW_DOWNSCALE
    source.height = geometry.bounds.height / GLOW_DOWNSCALE

    // Lift, then colour, then spread — in that order, because brightening after a
    // blur would raise the black the glow fades into along with the glow itself, and
    // saturating a clipped highlight has nothing left to saturate.
    const colour = new ColorMatrixFilter()
    colour.brightness(glowGain(slide.luma), false)
    colour.saturate(GLOW_SATURATE, true)

    const blur = new BlurFilter({ strength: GLOW_BLUR, quality: 4 })
    // Pixi derives this from the strength as 2x, which truncates the glow while it is
    // still at 8% and leaves a hard line. Set after construction, because the
    // strength setter is what writes the default.
    blur.padding = GLOW_BLUR * GLOW_TAIL

    source.filters = [colour, blur]

    const stage = new Container()
    stage.addChild(source)
    app.renderer.render({ container: stage, target, clear: true })
    stage.destroy({ children: true })

    sprite.texture = target
    sprite.position.set(geometry.bounds.x - GLOW_SPREAD, geometry.bounds.y - GLOW_SPREAD)
    sprite.scale.set(GLOW_DOWNSCALE)
    // `alpha` and `visible` belong to the ticker from here (glow.ts), which eases
    // this one up as the billboard's baked glow eases down.
  }, [app, isInitialised, texture, slide, geometry.bounds, stateRef])

  useEffect(
    () => () => {
      stateRef.current = { lit: false, glow: null }
    },
    [stateRef],
  )

  if (!slide || area.width <= 0 || area.height <= 0 || !fontReady) return null

  const palette = PALETTES[DEFAULT_PALETTE]

  // The headline's box, inset from the screen's largest solid rectangle.
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
          // Light type carrying its own ground as an outline, because what is behind
          // it is a photograph and could be any colour at all.
          fill: hex(palette.text),
          stroke: { color: hex(palette.ground), width: TEXT_STROKE, join: 'round' },
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

/**
 * How much to brighten this slide before blurring it into the billboard's glow.
 *
 * Bounded at both ends on purpose. The floor keeps a bright image from being dimmed
 * for being bright; the ceiling keeps a nearly-black one from being multiplied into
 * a flat white rectangle, which is a different failure from the one being fixed and
 * an uglier one. See the constants above.
 */
function glowGain(luma: number): number {
  if (!Number.isFinite(luma) || luma <= 0) return GLOW_MAX_GAIN
  return Math.min(GLOW_MAX_GAIN, Math.max(GLOW_BASE, (GLOW_TARGET / luma) * GLOW_BASE))
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
