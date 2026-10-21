/**
 * `npm run art` — import the `art/` inbox into `public/scene/`.
 *
 * This is the script that makes art a drop-in operation rather than a code change.
 * It reads the inbox, derives each layer's parallax band from its folder and its
 * draw order from its filename prefix, optimises everything to WebP with a PNG
 * fallback, measures alpha masks for hit testing, packs the character animation into
 * an atlas, and writes a manifest the renderer reads.
 *
 * Nothing in `app/` or `components/` needs to change when art changes. That is the
 * whole point: see art/README.md for the conventions this enforces.
 *
 * Run with `node scripts/import-art.ts` (Node runs TypeScript directly).
 */

import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import process from 'node:process'

import sharp, { type PngOptions } from 'sharp'

import { BAND_IDS, BANDS, type BandId } from '../components/scene/bands.ts'
import { HOTSPOTS, isDrawnObject } from '../components/scene/hotspots.ts'
import { PORTRAIT } from '../content/about.ts'
import { ART_PIECES } from '../content/art.ts'
import { POSTS } from '../content/posts.ts'
import { PROJECTS } from '../content/projects.ts'
import type { ContentImage, ContentImageManifest, ImageCollection } from '../lib/content-images.ts'
import { type HotspotId } from '../lib/scene-layout.ts'
import {
  MANIFEST_VERSION,
  type ManifestImage,
  type ManifestQuad,
  type SceneManifest,
} from '../lib/scene-manifest.ts'
import { CARD_FRAME, SCENE_H, SCENE_W } from '../lib/scene-space.ts'
import { DEFAULT_PALETTE, PALETTES } from '../lib/theme.ts'
import { packFrames } from './lib/pack.ts'

// --- configuration --------------------------------------------------------------

const ART_DIR = 'art'
const PUBLIC_DIR = 'public'

/** Generated scene tree: layers, objects, glow, the character atlas, the manifest. */
const SCENE_OUT = 'scene'

/**
 * Generated content-image tree: the images `content/` refers to by slug.
 *
 * Separate from the scene's because they are a different kind of asset with a
 * different manifest — see `lib/content-images.ts` for why they are not layers.
 */
const IMAGES_OUT = 'images'

const OUT_DIR = join(PUBLIC_DIR, SCENE_OUT)
const IMAGES_DIR = join(PUBLIC_DIR, IMAGES_OUT)

/** Lossy WebP with alpha. Painted art tolerates this well and it is far smaller. */
const WEBP = { quality: 82, effort: 5, alphaQuality: 90 } as const
const PNG = { compressionLevel: 9 } as const

/**
 * PNG settings for content images: quantised to a palette, unlike the scene's.
 *
 * The fallback exists for a browser with no WebP support, which in practice is none,
 * so what it really costs is repository weight — and that cost grows with every
 * drawing added to the art portfolio, which is exactly the direction this repository
 * has been burned in before (docs/ANIMATION.md). Full-colour PNG fallbacks for the
 * eight project screenshots came to 2.4 MB against 320 KB of WebP; palette encoding
 * brings them to roughly 600 KB and inside the per-image budget, measured.
 *
 * Scene layers keep the full-colour encoding. They are flat painted art composited
 * in WebGL, where a quantised gradient bands visibly, and there are three of them.
 */
const CONTENT_PNG = { compressionLevel: 9, palette: true, quality: 90, effort: 8 } as const

/**
 * The fallback encoding for a *photograph*, and which sources count as one.
 *
 * PNG is the right fallback for everything this site draws — flat colour, hard
 * edges, a palette that quantises to nothing — and it is the wrong one for a
 * camera. The portrait went in at 1600 x 1600 and came out a 1.1 MB PNG beside a
 * 177 KB WebP, five times the largest other file in `public/images/`, for a
 * fallback that only a browser without WebP will ever fetch. That is the kind of
 * weight `docs/ANIMATION.md` has a budget to stop.
 *
 * So the fallback keeps the source's own format family: a lossy input was never
 * going to be improved by lossless output. Decided by extension rather than by
 * inspecting the pixels, because the extension is the author's own statement of
 * what kind of image this is and is right every time it matters.
 */
const CONTENT_JPEG = { quality: 82, mozjpeg: true } as const

/** Sources whose fallback is JPEG rather than PNG — see `CONTENT_JPEG`. */
const PHOTO_EXT = new Set(['.jpg', '.jpeg'])

/** Mask cell size in scene units. 8 gives 320 x 180 cells over the canvas. */
const MASK_SCALE = 8

/**
 * Alpha at which a pixel counts as part of the art, for bounds and corners.
 *
 * Low, because these measurements are about where the art *ends*, and an
 * anti-aliased edge is still the art.
 */
const EDGE_ALPHA = 40

/** How far a measured surface quad is pushed outward, in scene units. See `bleed`. */
const SURFACE_BLEED = 2

/** Per-layer budget from docs/ANIMATION.md. Exceeding it warns rather than fails. */
const LAYER_BUDGET_BYTES = 400 * 1024

/**
 * Where layer art is read from, and how each file's parallax band is decided.
 *
 * Two ways to say the same thing, so that one file per band needs no folders and
 * several layers in a band still can have them:
 *
 *   - the folder names the band — `background/skyline/20-tower.png`
 *   - the filename names the band — `background/skyline.png`, `background/sky.png`
 *
 * A directory listed here with a band uses that band for everything in it, which is
 * why `foreground/` is flat: the room is one band, so naming each file after it
 * would be noise. A directory listed as `null` takes the band from each filename,
 * which is what lets `background/` hold one file per depth with no folders at all.
 */
const LAYER_DIRS: Record<string, BandId | null> = {
  background: null,
  'background/sky': 'sky',
  'background/skyline': 'skyline',
  foreground: 'room',
  'foreground/near': 'near',
}

/**
 * Which band each clickable object lives in.
 *
 * The billboard is the odd one: it is seen through the glass, so it travels at the
 * skyline's parallax factor rather than the room's (docs/DESIGN.md).
 */
const OBJECT_BANDS = Object.fromEntries(
  HOTSPOTS.map((hotspot) => [hotspot.id, hotspot.band]),
) as Record<HotspotId, BandId>

/** Objects draw in front of their band's layer art. */
const OBJECT_Z = 1000

/**
 * The hover glow, baked here rather than filtered at runtime.
 *
 * It is Henry's Clip Studio recipe — duplicate the layer, drop the copy underneath,
 * gaussian blur it — moved into the build, which is what makes hovering cost one
 * extra quad instead of a multi-pass blur on every frame something is lit
 * (docs/DESIGN.md § Lighting and glow).
 *
 * Rendered at a quarter of the canvas and scaled back up at draw time. A blur is a
 * low-pass filter, so there is nothing above a quarter resolution left to keep: the
 * texture is sixteen times smaller, the blur is sixteen times cheaper to compute,
 * and the result is indistinguishable because the GPU's bilinear upscale is itself a
 * blur.
 *
 * How much blur, brightness and saturation each object gets is *not* here — it is a
 * design decision per object and lives with the rest of them in
 * `components/scene/hotspots.ts`. A floodlit billboard and a bedside table should
 * not share a constant.
 */
const GLOW_DOWNSCALE = 4

const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg'])

/**
 * Video formats accepted in `art/pieces/`.
 *
 * Henry's animation software exports whichever of these is convenient, and the
 * inbox's job is to take what the software gives rather than to make him convert
 * (art/README.md). They are all transcoded to one MP4, so what is listed here is an
 * input format and never an output one.
 */
const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v'])

/**
 * The collections in `content/` that have images, and where their slugs come from.
 *
 * The import reads `content/` so the slug join can be checked from both ends. A
 * one-way check would miss the mistake that actually happens, which is not a missing
 * file but a mistyped name: `art/posts/rebuiling-the-site.png` imports perfectly and
 * then appears nowhere, with nothing anywhere saying why.
 *
 * Reading content from a build script is safe in exactly one direction — these
 * modules import types and nothing else, so nothing in `components/` or Pixi comes
 * with them. Keep it that way.
 */
const IMAGE_COLLECTIONS: readonly {
  id: ImageCollection
  /** Named in warnings, because that is the file where a slug gets fixed. */
  source: string
  slugs: readonly string[]
  /** Accepts video as well as stills. Pieces only — see `importContentImages`. */
  videos?: boolean
}[] = [
  {
    id: 'projects',
    source: 'content/projects.ts',
    slugs: PROJECTS.map((project) => project.slug),
  },
  {
    id: 'pieces',
    source: 'content/art.ts',
    slugs: ART_PIECES.map((piece) => piece.slug),
    videos: true,
  },
  {
    id: 'about',
    source: 'content/about.ts',
    slugs: [PORTRAIT.slug],
  },
]

/**
 * The images a post points at, as `<collection>:<slug>`.
 *
 * **Posts have no inbox.** A post is a notice about something already on the site, so
 * its picture is that thing's picture (`lib/content-images.ts`). What that means
 * here is that the billboard's saturated variant cannot be baked per post — it is
 * baked on whichever project screenshots and art pieces posts happen to reference,
 * and on nothing else, because every one of them is a second encoding of an image
 * this repository is already carrying.
 *
 * A video piece referenced by a post contributes its thumbnail, which is the still
 * of it that already exists.
 */
const BILLBOARD_IMAGES = new Set(
  POSTS.flatMap((post) => {
    if (post.target?.to === 'project') return [`projects:${post.target.slug}`]
    if (post.target?.to === 'piece') return [`pieces:${post.target.slug}`]
    return []
  }),
)

/**
 * Longest side of a content image, in pixels.
 *
 * Unlike a layer there is no canvas to match — these are photographs, screenshots
 * and drawings in whatever shape they were exported, and they are shown in a panel
 * or pasted onto the billboard's quad. So the only rule is a ceiling: enough for a
 * near-full-screen panel on a 2x display, and small enough to stay inside the
 * budget. Exports below it are left alone rather than upscaled.
 */
const CONTENT_MAX_PX = 1600

/** Per-image budget from docs/ANIMATION.md, measured on the WebP. Warns, never fails. */
const CONTENT_BUDGET_BYTES = 250 * 1024

/**
 * Per-video budget. Far larger than an image's, and still a budget.
 *
 * An animation is the one asset here that can reasonably run to megabytes, and this
 * repository has been burned by video weight before — the old site shipped a 4 MB
 * glitch intro and committed a 34 MB frame sequence (docs/ANIMATION.md). A piece over
 * this is usually one that wants trimming or a lower bitrate rather than one that
 * needs the bytes.
 */
const VIDEO_BUDGET_BYTES = 6 * 1024 * 1024

/**
 * How a post image is treated for the billboard.
 *
 * The carousel projects a screen in a neon city, not a picture on a wall, and the
 * skyline it sits in is painted entirely in full-strength coral, acid yellow and
 * cyan — an unmodified photograph or screenshot beside that reads as a dull grey
 * rectangle. So the import bakes a second, hard-saturated encoding and the carousel
 * uses it; the panel keeps the original, because the blog is a document.
 *
 * Baked rather than filtered for the reason in CLAUDE.md: a `ColorMatrixFilter` on
 * the mesh would cost a render target for as long as the carousel exists, which is
 * always. Brightness stays near 1 on purpose — the lesson from the glow bake is that
 * pushing brightness clips every channel and the result comes out *less* colourful,
 * so the punch has to come from saturation (docs/DESIGN.md § Lighting and glow).
 */
const BILLBOARD_LOOK = { saturation: 1.9, brightness: 1.06 } as const

/** Where the poster frame is pulled from, in seconds. Past any fade-in, before much happens. */
const POSTER_AT_SECONDS = 1

/**
 * Width of the flattened composite, three quarters of the design canvas.
 *
 * It is only ever shown where WebGL is unavailable, stretched over the viewport with
 * no camera on it, so it needs to hold up at full width but not to carry the detail
 * the canvas pans around inside. Full canvas would roughly triple the bytes for a
 * picture most visitors never fetch.
 */
const COMPOSITE_W = 1920

/**
 * The social card, at the size every scraper crops to.
 *
 * 1.905:1 against the scene's 1.778:1, so a centre crop trims a little off the top
 * and bottom of the room rather than pillarboxing it.
 */
const OG_W = 1200
const OG_H = 630

// --- reporting ------------------------------------------------------------------

const warnings: string[] = []

function warn(message: string): void {
  warnings.push(message)
}

function log(message: string): void {
  process.stdout.write(`${message}\n`)
}

// --- helpers --------------------------------------------------------------------

/**
 * Split `20-window-frame.png` into a draw order and an id.
 *
 * Order lives in the filename so that reordering layers is a rename rather than a
 * code edit. The prefix is optional: a band holding a single layer has nothing to
 * order, and making Henry write `10-` on a lone file would be ceremony. Unprefixed
 * layers draw after prefixed ones, in filename order — the ambiguity only matters
 * once a band has two of them, which is where `importLayers` warns.
 */
function parseLayerName(file: string): { z: number; id: string; ordered: boolean } {
  const stem = basename(file, extname(file))
  const match = /^(\d+)[-_](.+)$/.exec(stem)
  if (!match) return { z: Number.MAX_SAFE_INTEGER, id: stem, ordered: false }
  return { z: Number.parseInt(match[1]!, 10), id: match[2]!, ordered: true }
}

/**
 * The band a filename names, if it names one.
 *
 * `sky.png`, `skyline.png` and `skyline-west.png` all answer; anything else does
 * not, and the caller says so rather than guessing a depth. Guessing is the thing to
 * avoid here: a layer silently filed in the wrong band looks almost right and
 * parallaxes wrong, which is far harder to spot than a file that did not appear.
 */
function bandFromName(id: string): BandId | null {
  const head = id.split('-')[0]!.toLowerCase()
  return (BAND_IDS as readonly string[]).includes(head) ? (head as BandId) : null
}

async function listImages(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort()
}

/** Stills and, where the collection takes them, videos. One sorted list either way. */
async function listMedia(dir: string, videos: boolean): Promise<string[]> {
  if (!videos) return listImages(dir)
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => {
      const ext = extname(e.name).toLowerCase()
      return e.isFile() && (IMAGE_EXT.has(ext) || VIDEO_EXT.has(ext))
    })
    .map((e) => e.name)
    .sort()
}

/**
 * Normalise a layer to the design canvas.
 *
 * Every layer is a full-canvas frame with transparency where nothing is drawn, which
 * is what keeps art and hit areas in one coordinate space. Art that arrives at the
 * wrong size is reported and fitted rather than rejected, since refusing Henry's
 * export outright would be the less useful failure — but it is never silent.
 */
async function normaliseToCanvas(buffer: Buffer, label: string): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  if (meta.width === SCENE_W && meta.height === SCENE_H) return buffer

  warn(
    `${label} is ${meta.width}x${meta.height}, not the ${SCENE_W}x${SCENE_H} design ` +
      `canvas. Fitted onto the canvas; export at canvas size to control placement.`,
  )

  return sharp({
    create: {
      width: SCENE_W,
      height: SCENE_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: await sharp(buffer).resize(SCENE_W, SCENE_H, { fit: 'inside' }).toBuffer() }])
    .png()
    .toBuffer()
}

/**
 * Write both encodings into `public/<dir>/` and report the pair.
 *
 * `dir` is the served path rather than a filesystem one, because that is what ends
 * up in a manifest and the two must agree: `scene/layers` writes
 * `public/scene/layers/sky.webp` and reports `/scene/layers/sky.webp`. One encoder
 * for scene art and for content images — they want the same WebP-with-a-fallback
 * pair, and a second copy of this would be a second place for the quality settings
 * to drift.
 */
async function writeImagePair(
  buffer: Buffer,
  dir: string,
  id: string,
  pngEncoding: PngOptions = PNG,
  /** JPEG for a photographic source. See `CONTENT_JPEG`. */
  fallbackFormat: 'png' | 'jpeg' = 'png',
): Promise<{ src: string; fallback: string; width: number; height: number; bytes: number }> {
  await mkdir(join(PUBLIC_DIR, dir), { recursive: true })

  const jpeg = fallbackFormat === 'jpeg'
  const ext = jpeg ? 'jpg' : 'png'

  const webp = await sharp(buffer).webp(WEBP).toBuffer()
  const fallback = jpeg
    ? await sharp(buffer).jpeg(CONTENT_JPEG).toBuffer()
    : await sharp(buffer).png(pngEncoding).toBuffer()
  const meta = await sharp(buffer).metadata()

  await writeFile(join(PUBLIC_DIR, dir, `${id}.webp`), webp)
  await writeFile(join(PUBLIC_DIR, dir, `${id}.${ext}`), fallback)

  return {
    src: `/${dir}/${id}.webp`,
    fallback: `/${dir}/${id}.${ext}`,
    // sharp reports both for anything it could decode, and throws above for anything
    // it could not, so these fallbacks are unreachable; the types allow undefined.
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: webp.length,
  }
}

// --- layers ---------------------------------------------------------------------

async function importLayers(): Promise<SceneManifest['layers']> {
  const layers: SceneManifest['layers'] = []
  const unordered = new Map<BandId, string[]>()

  for (const [relative, dirBand] of Object.entries(LAYER_DIRS)) {
    const dir = join(ART_DIR, relative)
    const files = await listImages(dir)

    for (const file of files) {
      const { z, id, ordered } = parseLayerName(file)
      const label = `${relative}/${file}`

      const band = dirBand ?? bandFromName(id)
      if (!band) {
        warn(
          `${label} does not say which band it is in. Name it after one — ` +
            `${BAND_IDS.join('.png, ')}.png — or move it into a folder of that ` +
            `name. Skipped rather than guessed, since a layer at the wrong depth ` +
            `looks nearly right and parallaxes wrong. See art/README.md.`,
        )
        continue
      }

      // A file named after its band or its folder is just "the layer of this band",
      // so it takes the band's own name. Without this, `background/skyline.png` and
      // `foreground/foreground.png` import as `skyline-skyline` and `room-foreground`.
      const folder = relative.split('/').pop()!
      const layerId = id === band || id === folder ? band : `${band}-${id}`

      const source = await normaliseToCanvas(await readFile(join(dir, file)), label)
      const written = await writeImagePair(source, `${SCENE_OUT}/layers`, layerId)

      if (written.bytes > LAYER_BUDGET_BYTES) {
        warn(
          `${label} is ${kb(written.bytes)} as WebP, over the ${kb(LAYER_BUDGET_BYTES)} ` +
            `per-layer budget in docs/ANIMATION.md.`,
        )
      }

      if (!ordered) unordered.set(band, [...(unordered.get(band) ?? []), label])

      layers.push({ id: layerId, band, z, ...stripBytes(written) })
      log(
        `  layer  ${band.padEnd(8)} ${(ordered ? `z=${String(z).padStart(4)}` : 'unordered').padEnd(8)}  ` +
          `${layerId}  (${kb(written.bytes)})`,
      )
    }
  }

  for (const [band, files] of unordered) {
    if (files.length < 2) continue
    warn(
      `${files.join(' and ')} are both in the ${band} band with no NN- prefix, so ` +
        `their draw order is alphabetical rather than chosen. Prefix them ` +
        `(10-, 20-) to decide which is in front.`,
    )
  }

  // Back to front: band order first, then z within the band, then filename so that
  // unprefixed layers still land in a stable, reproducible order.
  layers.sort(
    (a, b) => BANDS[a.band].z - BANDS[b.band].z || a.z - b.z || a.id.localeCompare(b.id),
  )
  return layers
}

// --- objects --------------------------------------------------------------------

/**
 * The largest axis-aligned rectangle that fits inside a grid of solid cells.
 *
 * Standard largest-rectangle-in-a-histogram, run once per row. It exists so that
 * what gets drawn *on* an object — the billboard's headlines — can be placed from
 * the art rather than from a rectangle typed into a file next to it. Henry drew the
 * billboard as a perspective quad; a hand-written rect would have to be re-typed
 * every time that quad moves, and would be wrong in between.
 */
function largestInnerRect(
  cells: Uint8Array,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  const heights = new Int32Array(width)
  let best = { x: 0, y: 0, width: 0, height: 0 }
  let bestArea = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heights[x] = cells[y * width + x] ? heights[x]! + 1 : 0
    }

    const stack: number[] = []
    for (let x = 0; x <= width; x++) {
      const current = x === width ? 0 : heights[x]!
      while (stack.length > 0 && heights[stack[stack.length - 1]!]! >= current) {
        const top = stack.pop()!
        const barHeight = heights[top]!
        const left = stack.length > 0 ? stack[stack.length - 1]! + 1 : 0
        const barWidth = x - left
        const area = barWidth * barHeight
        if (area > bestArea) {
          bestArea = area
          best = { x: left, y: y - barHeight + 1, width: barWidth, height: barHeight }
        }
      }
      stack.push(x)
    }
  }

  return best
}

/**
 * Measure a 1-bit alpha mask, the art's tight bounds, its largest solid rect and its
 * four corners.
 *
 * All of them are derived from the art rather than declared in code, so a redrawn
 * object brings its own hit area and its own carousel surface with it, and the two
 * can never drift apart.
 *
 * **Everything but the mask is measured at full resolution.** The mask is
 * deliberately coarse — it is for hit testing, where a cell either catches the
 * pointer or does not, and being a few units generous is better than being strict.
 * The quad is not like that: the billboard's carousel is pinned to it, so an error
 * there is a visible sliver of unlit screen along the edge of a projected image.
 * Measuring it off the 320 x 180 mask quantised every corner to 8 scene units and
 * did exactly that — up to 5.5 units of the billboard's peach surface showed down
 * the right-hand side, and because the four corners rounded in different directions
 * it also skewed the perspective the image was projected at. The same goes for
 * `bounds`, which places the carousel's glow, and `inner`, which is where a headline
 * sits.
 */
async function measureAlpha(buffer: Buffer): Promise<{
  mask: { scale: number; width: number; height: number; bits: string }
  bounds: { x: number; y: number; width: number; height: number }
  inner: { x: number; y: number; width: number; height: number }
  quad: ManifestQuad
}> {
  // --- the mask: coarse and generous, for hit testing ---------------------------
  const maskWidth = Math.ceil(SCENE_W / MASK_SCALE)
  const maskHeight = Math.ceil(SCENE_H / MASK_SCALE)

  // Downsampling averages alpha, so a cell counts as solid if its average clears a
  // low bar. That deliberately errs toward slightly generous hit areas: a hover that
  // triggers a few pixels early is unnoticeable, one that fails on an object's edge
  // feels broken.
  const { data: maskData } = await sharp(buffer)
    .resize(maskWidth, maskHeight, { fit: 'fill', kernel: 'cubic' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const bytes = new Uint8Array(Math.ceil((maskWidth * maskHeight) / 8))
  for (let i = 0; i < maskWidth * maskHeight; i++) {
    if (maskData[i * 4 + 3]! < EDGE_ALPHA) continue
    bytes[i >> 3]! |= 1 << (7 - (i & 7))
  }

  // --- bounds, inner and the corners: exact -------------------------------------
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info

  // Objects are normalised to the design canvas, so a pixel coordinate here is
  // already a scene coordinate and nothing needs scaling back up.
  const solid = new Uint8Array(width * height)
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  // The four corners, found as the extremes along the two diagonals. For a convex
  // quad — which a screen, a sign or any flat panel is — min(x+y) is the top-left,
  // max(x+y) the bottom-right, max(x-y) the top-right and min(x-y) the bottom-left,
  // whatever angle it is drawn at. A concave shape would return a quad that encloses
  // it rather than follows it, which is why surfaces are documented as quads.
  const corner = {
    tl: { x: 0, y: 0, key: Number.POSITIVE_INFINITY },
    br: { x: 0, y: 0, key: Number.NEGATIVE_INFINITY },
    tr: { x: 0, y: 0, key: Number.NEGATIVE_INFINITY },
    bl: { x: 0, y: 0, key: Number.POSITIVE_INFINITY },
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3]!
      // Strict for `inner`, because that rect is where something gets drawn on top
      // and it has to land on the solid part.
      if (alpha >= 250) solid[y * width + x] = 1
      if (alpha < EDGE_ALPHA) continue

      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y

      const sum = x + y
      const diff = x - y
      if (sum < corner.tl.key) corner.tl = { x, y, key: sum }
      if (sum > corner.br.key) corner.br = { x, y, key: sum }
      if (diff > corner.tr.key) corner.tr = { x, y, key: diff }
      if (diff < corner.bl.key) corner.bl = { x, y, key: diff }
    }
  }

  const inner = largestInnerRect(solid, width, height)
  const empty = maxX < 0

  return {
    mask: {
      scale: MASK_SCALE,
      width: maskWidth,
      height: maskHeight,
      bits: Buffer.from(bytes).toString('base64'),
    },
    bounds: empty
      ? { x: 0, y: 0, width: 0, height: 0 }
      : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    inner,
    quad: empty ? { x0: 0, y0: 0, x1: 0, y1: 0, x2: 0, y2: 0, x3: 0, y3: 0 } : bleed(corner),
  }
}

/**
 * Push a measured quad a hair outward from its own centre.
 *
 * Whatever alpha threshold the corners are found at, they land *inside* the painted
 * edge — the last pixel above the threshold, with the anti-aliased ramp beyond it
 * uncounted. For a hit area that is the right way to be wrong. For the billboard it
 * is not: a projection a pixel short leaves a line of the unlit screen showing along
 * one edge, which is exactly the thing a lit screen never does, while one that
 * overhangs by a pixel lands on the black frame drawn around it and cannot be seen.
 *
 * So the direction to fail in is chosen here rather than left to a threshold. Two
 * units, which covers an anti-aliased edge and nothing more.
 */
function bleed(corner: Record<'tl' | 'tr' | 'br' | 'bl', { x: number; y: number }>): ManifestQuad {
  const points = [corner.tl, corner.tr, corner.br, corner.bl]
  const cx = points.reduce((n, p) => n + p.x, 0) / 4
  const cy = points.reduce((n, p) => n + p.y, 0) / 4

  const out = points.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const length = Math.hypot(dx, dy) || 1
    return {
      x: Math.round(p.x + (dx / length) * SURFACE_BLEED),
      y: Math.round(p.y + (dy / length) * SURFACE_BLEED),
    }
  })

  return {
    x0: out[0]!.x,
    y0: out[0]!.y,
    x1: out[1]!.x,
    y1: out[1]!.y,
    x2: out[2]!.x,
    y2: out[2]!.y,
    x3: out[3]!.x,
    y3: out[3]!.y,
  }
}

/**
 * A pre-blurred, saturation-boosted copy of an object's own art.
 *
 * Its colour comes from the object's pixels, which is the entire point: a warm desk
 * glows warm and the bed's grey-blue glows cool, with nothing to keep in step by
 * hand. Redraw the object in a new colour and the glow follows on the next import.
 *
 * The alpha is blurred along with the colour, so what comes out is a soft falloff
 * around the silhouette rather than a hard-edged smear — which is why this blurs the
 * composited RGBA rather than blurring a tinted silhouette.
 */
async function buildGlow(
  source: Buffer,
  id: HotspotId,
): Promise<ManifestImage & { bytes: number }> {
  const width = Math.round(SCENE_W / GLOW_DOWNSCALE)
  const height = Math.round(SCENE_H / GLOW_DOWNSCALE)
  const spec = HOTSPOTS.find((hotspot) => hotspot.id === id)!.glow

  const blurred = await sharp(source)
    .resize(width, height, { fit: 'fill' })
    // Brightness and saturation before the blur, so the lift spreads with the light
    // instead of only intensifying the silhouette it came from.
    .modulate({ brightness: spec.boost, saturation: spec.saturation })
    .blur(spec.blur)
    .ensureAlpha()
    .raw()
    .toBuffer()

  // Re-amplify alpha after the blur. Blurring spreads a fixed amount of opacity over
  // a larger area, so it buys reach at the cost of intensity everywhere; without
  // this, turning `blur` up makes a glow fainter rather than bigger. Done on the raw
  // buffer because sharp's channel operations work on colour, and this is alpha.
  //
  // The curve is `1 - (1 - a)^gain`, not `a * gain`, and that is the whole
  // difference between a glow and a blob. A multiply clips: everything above
  // `255 / gain` lands on opaque, so a large part of the halo goes perfectly flat and
  // the boundary where it stops clipping reads as a hard edge drawn around the
  // object. This curve approaches opaque without reaching it, so it lifts the faint
  // outer falloff hard, barely touches the already-bright core, and stays smooth
  // everywhere — which is what a falloff has to be to look like light.
  for (let i = 3; i < blurred.length; i += 4) {
    const a = blurred[i]! / 255
    blurred[i] = Math.round(255 * (1 - Math.pow(1 - a, spec.gain)))
  }

  const glow = await sharp(blurred, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer()

  return writeImagePair(glow, `${SCENE_OUT}/glow`, id)
}

async function importObjects(): Promise<SceneManifest['objects']> {
  const dir = join(ART_DIR, 'objects')
  const files = await listImages(dir)
  const objects: SceneManifest['objects'] = []

  const seen = new Set<string>()

  for (const file of files) {
    const id = basename(file, extname(file))
    if (!(id in OBJECT_BANDS)) {
      warn(
        `art/objects/${file} is not a known hotspot. Expected one of ` +
          `${Object.keys(OBJECT_BANDS).join(', ')}.png — skipped.`,
      )
      continue
    }

    const hotspot = id as HotspotId
    seen.add(hotspot)

    const source = await normaliseToCanvas(await readFile(join(dir, file)), `objects/${file}`)
    const written = await writeImagePair(source, `${SCENE_OUT}/objects`, hotspot)
    const glow = await buildGlow(source, hotspot)
    const { mask, bounds, inner, quad } = await measureAlpha(source)

    if (bounds.width === 0) {
      warn(`art/objects/${file} is fully transparent, so it can never be clicked.`)
    }

    objects.push({
      id: hotspot,
      band: OBJECT_BANDS[hotspot],
      z: OBJECT_Z,
      bounds,
      inner,
      quad,
      mask,
      glow: stripBytes(glow),
      ...stripBytes(written),
    })

    log(
      `  object ${OBJECT_BANDS[hotspot].padEnd(8)}        ${hotspot}  ` +
        `(${kb(written.bytes)} + ${kb(glow.bytes)} glow, hit area ${bounds.width}x${bounds.height})`,
    )
  }

  for (const id of Object.keys(OBJECT_BANDS)) {
    if (!seen.has(id)) {
      warn(`No art/objects/${id}.png, so the "${id}" hotspot has nothing to click.`)
    }
  }

  return objects
}

// --- content images -------------------------------------------------------------

/**
 * Optimise the images `content/` refers to by slug.
 *
 * Every image in the folder is imported, including one no entry claims yet, so that
 * dropping in a picture and *then* writing the entry works — that is the order the
 * writing actually happens in, and making it need a second import run would be a
 * trap. The unclaimed ones are reported instead, which is the only way a mistyped
 * filename ever surfaces.
 *
 * Nothing is measured here and nothing is normalised to a canvas. A content image
 * has no band, no hit area and no glow; it is resized under a ceiling, encoded, and
 * named after its slug. See `lib/content-images.ts`.
 */
/**
 * Check that every post points at something that exists.
 *
 * A post's `target` is a slug join like every other one in `content/`, and it is the
 * only one whose failure a *reader* experiences: a mistyped project slug links to an
 * anchor that is not on the page, so the Coding tab opens and simply does not scroll,
 * which looks like the site is broken rather than like a picture is missing. Cheap to
 * check here, impossible to see anywhere else.
 *
 * Checked in this script because this is already the one command that verifies the
 * slug joins in `content/` from both ends (`IMAGE_COLLECTIONS`), and because it runs
 * before a build rather than during one.
 */
function checkPostTargets(): void {
  const projects = new Set(PROJECTS.map((project) => project.slug))
  const pieces = new Set(ART_PIECES.map((piece) => piece.slug))

  for (const post of POSTS) {
    const target = post.target
    if (!target) continue

    if (target.to === 'project' && !projects.has(target.slug)) {
      warn(
        `Post "${post.slug}" targets project "${target.slug}", which is not in ` +
          `content/projects.ts. The Blog link would land on an anchor that does not ` +
          `exist.`,
      )
    }

    if (target.to === 'piece' && !pieces.has(target.slug)) {
      warn(
        `Post "${post.slug}" targets art piece "${target.slug}", which is not in ` +
          `content/art.ts. The Blog link would open the Art tab with nothing in the ` +
          `popup.`,
      )
    }
  }
}

/**
 * Transcode a video piece to one MP4 every browser can play.
 *
 * Always transcoded, never copied, even when the input is already an MP4. The point
 * of the inbox is that Henry exports whatever his software exports most easily, and
 * "whatever it exports" includes a ProRes `.mov`, a VP9 `.webm` and an H.265 MP4 that
 * Safari plays and Chrome does not. One output format means the popup needs one
 * `<source>` and no fallback chain.
 *
 * `faststart` moves the index to the front of the file so playback can begin before
 * the whole thing has arrived, which for a piece opened in a popup is the difference
 * between a click and a wait. The scale filter caps the long side at the same ceiling
 * stills get and then rounds to even dimensions, which `yuv420p` requires.
 *
 * Audio is kept if there is any, and the popup plays muted — the reader can unmute,
 * but nothing on this site makes a sound unasked (docs/DESIGN.md § Accessibility).
 */
function transcodeVideo(input: string, output: string): void {
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      input,
      '-vf',
      `scale='min(${CONTENT_MAX_PX},iw)':'min(${CONTENT_MAX_PX},ih)':force_original_aspect_ratio=decrease,` +
        'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v',
      'libx264',
      '-preset',
      'slow',
      '-crf',
      '24',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      output,
    ],
    { stdio: 'inherit' },
  )
}

/**
 * One frame out of a video, for the grid thumbnail and the popup's poster.
 *
 * Taken from the *transcoded* file rather than the source, so the frame's dimensions
 * are the video's dimensions and the grid cannot be laid out against a size the
 * player does not have.
 *
 * `-ss` ahead of `-i` seeks before decoding, which is fast but lands on the nearest
 * keyframe — exactly what is wanted for a thumbnail. A clip shorter than the seek
 * produces no frame at all rather than an error, so that falls back to the first.
 */
function extractPosterFrame(input: string, output: string): void {
  const run = (seconds: number) =>
    execFileSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        String(seconds),
        '-i',
        input,
        '-frames:v',
        '1',
        output,
      ],
      { stdio: 'inherit' },
    )

  run(POSTER_AT_SECONDS)
  if (!existsSync(output)) run(0)
}

/**
 * The saturated copy of a post image that the billboard projects, and how bright it
 * is.
 *
 * Written beside the original as `<slug>--lit`, with the two dashes marking it as a
 * generated variant of the file next to it rather than a slug of its own — nothing
 * in `content/` can name it, which is the intent. See `BILLBOARD_LOOK`.
 *
 * **`luma` is what makes the glow work on a dark image.** The billboard's light is a
 * blurred copy of whatever is on the screen, composited additively — and additive
 * blending of a near-black image adds nothing at any alpha, so a dark post simply did
 * not light the city. Turning the opacity up cannot fix that; there is nothing there
 * to be more of. What fixes it is brightening the copy, and how far to brighten it is
 * a question about the particular image: a neon drawing needs none, a mostly-black
 * screenshot needs a great deal. Measured here rather than at runtime because the
 * answer never changes, and reading a texture back from the GPU to find it would be
 * both slow and absurd.
 *
 * Rec. 709 luma, averaged over the image, as a fraction of full brightness.
 */
async function writeLitVariant(
  source: Buffer,
  dir: string,
  slug: string,
  /** Matched to the image it is a copy of, so the pair never disagrees. */
  format: 'png' | 'jpeg',
): Promise<ManifestImage & { luma: number }> {
  const lit = await sharp(source).modulate(BILLBOARD_LOOK).toBuffer()
  const written = stripBytes(await writeImagePair(lit, dir, `${slug}--lit`, CONTENT_PNG, format))

  const { channels } = await sharp(lit).removeAlpha().stats()
  const [r, g, b] = channels
  const luma = ((r?.mean ?? 0) * 0.2126 + (g?.mean ?? 0) * 0.7152 + (b?.mean ?? 0) * 0.0722) / 255

  return { ...written, luma: Number(luma.toFixed(4)) }
}

async function importContentImages(): Promise<ContentImageManifest['images']> {
  const images: ContentImageManifest['images'] = { projects: {}, pieces: {}, about: {} }

  for (const collection of IMAGE_COLLECTIONS) {
    const dir = join(ART_DIR, collection.id)
    const files = await listMedia(dir, collection.videos === true)
    const outDir = `${IMAGES_OUT}/${collection.id}`
    const slugs = new Set(collection.slugs)
    const claimed = new Set<string>()
    const orphans: string[] = []

    for (const [slug, found] of groupBySlug(files, collection.id)) {
      const still = found.stills[0]
      const video = found.videos[0]
      const label = `art/${collection.id}/${video ?? still}`

      if (slugs.has(slug)) claimed.add(slug)
      else orphans.push(video ?? still!)

      const entry = video
        ? await importVideo({
            dir,
            file: video,
            slug,
            outDir,
            label,
            collection: collection.id,
            // A still beside a video is its thumbnail rather than a competing
            // entry — see `groupBySlug`.
            thumbnail: still,
            lit: BILLBOARD_IMAGES.has(`${collection.id}:${slug}`),
          })
        : await importStill({
            dir,
            file: still!,
            slug,
            outDir,
            label,
            collection: collection.id,
            lit: BILLBOARD_IMAGES.has(`${collection.id}:${slug}`),
          })

      if (entry) images[collection.id][slug] = entry
    }

    const missing = collection.slugs.filter((slug) => !claimed.has(slug))
    if (missing.length > 0) {
      warn(
        `No image in art/${collection.id}/ for ${missing.join(', ')} ` +
          `(from ${collection.source}). Those entries render without one — drop in ` +
          `art/${collection.id}/<slug>.png to give them a picture.`,
      )
    }

    if (orphans.length > 0) {
      warn(
        `art/${collection.id}/ holds ${orphans.join(', ')}, which no entry in ` +
          `${collection.source} claims. Mistyped slug? Imported anyway, so adding ` +
          `the entry is all it takes to show it.`,
      )
    }
  }

  return images
}

/**
 * Collect an inbox folder's files under the slug each one claims.
 *
 * **A still beside a video of the same name is its thumbnail, not a rival.** That
 * pairing is the only way to choose what a video piece looks like at rest: the grid
 * needs a square cell, the feed needs a 64px square and the billboard needs
 * something to project, and the frame a machine picks one second in is a guess. Drop
 * `walk-cycle.png` next to `walk-cycle.mp4` and it wins; drop nothing and the
 * import keeps guessing, which is what makes the thumbnail optional rather than a
 * chore attached to every animation.
 *
 * Two files of the *same kind* under one slug are still a collision — `fwubbo.png`
 * left behind beside a new `fwubbo.jpg` would both write `fwubbo.webp`, and the
 * alphabetically later one would win with nothing said. That reads as "I replaced
 * the image and the site did not change", which is the one failure this inbox exists
 * to make impossible. Keep the first, deterministically, and report both.
 */
function groupBySlug(
  files: readonly string[],
  collection: ImageCollection,
): Map<string, { stills: string[]; videos: string[] }> {
  const bySlug = new Map<string, { stills: string[]; videos: string[] }>()

  for (const file of files) {
    const slug = basename(file, extname(file))
    const group = bySlug.get(slug) ?? { stills: [], videos: [] }
    if (VIDEO_EXT.has(extname(file).toLowerCase())) group.videos.push(file)
    else group.stills.push(file)
    bySlug.set(slug, group)
  }

  for (const [slug, group] of bySlug) {
    for (const kind of ['stills', 'videos'] as const) {
      if (group[kind].length < 2) continue
      const [kept, ...rest] = group[kind]
      warn(
        `art/${collection}/ holds ${group[kind].join(' and ')}, which all claim ` +
          `${slug}. Kept ${kept}; delete ${rest.join(' and ')}, since which one wins ` +
          `is alphabetical rather than chosen.`,
      )
    }
  }

  return bySlug
}

type MediaImport = {
  dir: string
  file: string
  slug: string
  /** Served path, which is also the manifest's. `images/pieces`, not a filesystem path. */
  outDir: string
  /** `art/pieces/x.mp4` — named in warnings, because that is the file to fix. */
  label: string
  collection: ImageCollection
  /** Bake the billboard's saturated copy: this image is one a post points at. */
  lit: boolean
}

/**
 * One still: resized under the ceiling, encoded, and named after its slug.
 *
 * Nothing is measured and nothing is normalised to a canvas. A content image has no
 * band, no hit area and no glow. See `lib/content-images.ts`.
 */
async function importStill({
  dir,
  file,
  slug,
  outDir,
  label,
  collection,
  lit,
}: MediaImport): Promise<ContentImage> {
  const written = await writeStill(join(dir, file), outDir, slug, label, lit)

  log(
    `  image  ${collection.padEnd(8)}        ${slug}  ` +
      `(${kb(written.bytes)}, ${written.image.width}x${written.image.height}` +
      `${written.image.lit ? ` + lit, luma ${written.image.lit.luma.toFixed(3)}` : ''})`,
  )

  return written.image
}

/**
 * Encode one still into the pair the manifest names, plus the billboard's copy.
 *
 * Shared by a drawing and by a video's thumbnail, because they are the same thing
 * once the file is on disk — which is the point of letting a video carry a chosen
 * thumbnail at all.
 */
async function writeStill(
  path: string,
  outDir: string,
  slug: string,
  label: string,
  lit: boolean,
): Promise<{ image: ContentImage; bytes: number }> {
  // `fit: 'inside'` keeps the aspect it was given: the billboard mesh crops to
  // fill at draw time and a panel lays out to whatever shape arrives, so
  // cropping here would throw away pixels on a guess about a layout that has
  // not been designed yet. `withoutEnlargement` keeps a small export sharp
  // rather than inventing resolution for it.
  //
  // sharp drops EXIF unless asked to keep it, which is the behaviour to want
  // here — a phone photo of a sketchbook carries the place it was taken.
  const source = await sharp(await readFile(path))
    .resize(CONTENT_MAX_PX, CONTENT_MAX_PX, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer()

  // The author's own extension decides, so a drawing exported as a JPEG gets a
  // JPEG fallback too. That is correct rather than a near miss: it was already
  // through one lossy encode before it reached the inbox.
  const format = PHOTO_EXT.has(extname(path).toLowerCase()) ? 'jpeg' : 'png'
  const written = await writeImagePair(source, outDir, slug, CONTENT_PNG, format)

  if (written.bytes > CONTENT_BUDGET_BYTES) {
    warn(
      `${label} is ${kb(written.bytes)} as WebP, over the ${kb(CONTENT_BUDGET_BYTES)} ` +
        `per-image budget in docs/ANIMATION.md.`,
    )
  }

  const image: ContentImage = stripBytes(written)
  if (lit) image.lit = await writeLitVariant(source, outDir, slug, format)

  return { image, bytes: written.bytes }
}

/**
 * One video piece: transcoded, and given the thumbnail everything else shows.
 *
 * **A video needs a still of itself**, in three places that never play it — the
 * grid's square cell, the blog feed's 64px square, and the billboard, which projects
 * whatever a post points at. So one is always produced: a frame pulled a second in,
 * or the file Henry dropped beside the video if he wanted to choose it.
 *
 * The frame is extracted either way, because it is also how the video's own
 * dimensions are measured — a chosen thumbnail may be any shape, and the player
 * needs the shape of the thing it is going to play.
 *
 * A missing or broken ffmpeg warns and drops the piece rather than failing the
 * import. Everything else in the inbox is independent of it, and an import that
 * refuses to run because one animation could not be encoded would block work on the
 * scene for a reason that has nothing to do with the scene.
 */
async function importVideo({
  dir,
  file,
  slug,
  outDir,
  label,
  collection,
  thumbnail,
  lit,
}: MediaImport & { thumbnail?: string }): Promise<ContentImage | null> {
  const input = join(dir, file)
  const absOutDir = join(PUBLIC_DIR, outDir)
  await mkdir(absOutDir, { recursive: true })

  const videoPath = join(absOutDir, `${slug}.mp4`)
  const framePath = join(absOutDir, `${slug}.frame.png`)

  try {
    transcodeVideo(input, videoPath)
    extractPosterFrame(videoPath, framePath)
  } catch (error: unknown) {
    warn(
      `${label} could not be transcoded (${
        error instanceof Error ? error.message.split('\n')[0] : String(error)
      }). ffmpeg is required for video pieces; the entry renders without media.`,
    )
    return null
  }

  if (!existsSync(framePath)) {
    warn(`${label} transcoded but produced no frame, so it has no thumbnail.`)
    return null
  }

  const frame = await sharp(await readFile(framePath)).metadata()
  const poster = thumbnail ? join(dir, thumbnail) : framePath
  const written = await writeStill(poster, outDir, slug, label, lit)
  await rm(framePath, { force: true })

  const bytes = (await stat(videoPath)).size
  if (bytes > VIDEO_BUDGET_BYTES) {
    warn(
      `${label} is ${kb(bytes)} as MP4, over the ${kb(VIDEO_BUDGET_BYTES)} per-video ` +
        `budget. Trim it or lower the bitrate rather than shipping it.`,
    )
  }

  log(
    `  video  ${collection.padEnd(8)}        ${slug}  ` +
      `(${kb(bytes)} mp4 ${frame.width}x${frame.height}, ` +
      `${thumbnail ? `thumbnail ${thumbnail}` : 'thumbnail from 1s in'}` +
      `${written.image.lit ? ' + lit' : ''})`,
  )

  return {
    ...written.image,
    video: {
      src: `/${outDir}/${slug}.mp4`,
      type: 'video/mp4',
      // The video's own size, not the thumbnail's: a chosen thumbnail may be any
      // shape, and these size the player.
      width: frame.width ?? written.image.width,
      height: frame.height ?? written.image.height,
    },
  }
}

// --- character ------------------------------------------------------------------

type CharacterMeta = { fps: number; anchor: { x: number; y: number }; scale: number }

/**
 * Find `meta.json`, wherever it was dropped.
 *
 * Searched in order of specificity. `sourceDir` matters separately from `frameDir`
 * because the video path extracts frames to a temporary directory, so a meta.json
 * sitting next to the video would otherwise never be found and the author's fps
 * would be silently replaced by the default.
 */
async function readCharacterMeta(frameDir: string, sourceDir: string): Promise<CharacterMeta> {
  const defaults: CharacterMeta = {
    fps: 24,
    anchor: { x: SCENE_W / 2, y: SCENE_H * 0.78 },
    scale: 1,
  }

  const candidates = [
    join(frameDir, 'meta.json'),
    join(sourceDir, 'meta.json'),
    join(ART_DIR, 'character', 'meta.json'),
  ]

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    try {
      const parsed = JSON.parse(await readFile(candidate, 'utf8')) as Partial<CharacterMeta>
      return {
        fps: parsed.fps ?? defaults.fps,
        anchor: parsed.anchor ?? defaults.anchor,
        scale: parsed.scale ?? defaults.scale,
      }
    } catch {
      warn(`${candidate} is not valid JSON; using defaults.`)
    }
  }

  return defaults
}

/** Numeric-aware sort, so frame 2 precedes frame 10 whatever the padding. */
function sortFrames(files: string[]): string[] {
  const keyOf = (name: string) => {
    const digits = /(\d+)(?!.*\d)/.exec(basename(name, extname(name)))
    return digits ? Number.parseInt(digits[1]!, 10) : Number.MAX_SAFE_INTEGER
  }
  return [...files].sort((a, b) => keyOf(a) - keyOf(b) || a.localeCompare(b))
}

/** Extract frames from a video into PNGs. Treated as a sequence from there on. */
function extractVideoFrames(file: string, outDir: string): void {
  execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, join(outDir, 'frame_%05d.png')],
    { stdio: 'inherit' },
  )
}

async function importCharacter(tmpDir: string): Promise<SceneManifest['character']> {
  const base = join(ART_DIR, 'character')

  const sequenceDir = join(base, 'sequence')
  const videoDir = join(base, 'video')
  const atlasDir = join(base, 'atlas')

  // Pre-packed: pass it through untouched.
  const atlasFiles = await listImages(atlasDir)
  if (atlasFiles.length > 0) {
    warn(
      'art/character/atlas/ holds a pre-packed sheet. Passing sheets through is not ' +
        'implemented yet (Phase 5) — drop a sequence or a video instead, or wire up ' +
        'the manifest by hand.',
    )
    return null
  }

  let frameFiles: string[] = []
  let frameDir = sequenceDir
  let sourceDir = sequenceDir

  const sequenceFiles = await listImages(sequenceDir)
  if (sequenceFiles.length > 0) {
    frameFiles = sortFrames(sequenceFiles)
  } else {
    const videos = existsSync(videoDir)
      ? (await readdir(videoDir)).filter((f) => /\.(mp4|webm|mov)$/i.test(f))
      : []

    if (videos.length === 0) return null

    if (videos.length > 1) {
      warn(`art/character/video/ holds ${videos.length} videos; using ${videos[0]}.`)
    }

    sourceDir = videoDir
    frameDir = join(tmpDir, 'video-frames')
    await mkdir(frameDir, { recursive: true })
    log(`  extracting frames from ${videos[0]}`)
    extractVideoFrames(join(videoDir, videos[0]!), frameDir)
    frameFiles = sortFrames(await listImages(frameDir))

    if (frameFiles.length === 0) {
      warn(`ffmpeg produced no frames from ${videos[0]}.`)
      return null
    }
  }

  const meta = await readCharacterMeta(frameDir, sourceDir)

  // Trim each frame to its content. Character frames are mostly empty space, and
  // trimming often halves the sheet count (docs/ANIMATION.md).
  const trimmed = await Promise.all(
    frameFiles.map(async (file, index) => {
      const buffer = await readFile(join(frameDir, file))
      const base = sharp(buffer).ensureAlpha()
      const full = await base.metadata()

      const { data, info } = await base
        .trim({ threshold: 1 })
        .raw()
        .toBuffer({ resolveWithObject: true })

      return {
        index,
        data,
        width: info.width,
        height: info.height,
        channels: info.channels,
        offsetX: -(info.trimOffsetLeft ?? 0),
        offsetY: -(info.trimOffsetTop ?? 0),
        fullWidth: full.width ?? info.width,
        fullHeight: full.height ?? info.height,
      }
    }),
  )

  const packed = packFrames(trimmed.map((f) => ({ index: f.index, width: f.width, height: f.height })))

  // Composite each sheet from its frames.
  const sheets: SceneManifest['character'] extends null ? never : NonNullable<SceneManifest['character']>['sheets'] =
    []

  for (let sheetIndex = 0; sheetIndex < packed.sheets.length; sheetIndex++) {
    const size = packed.sheets[sheetIndex]!
    const members = packed.frames.filter((f) => f.sheet === sheetIndex)

    const composite = await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        members.map((frame) => {
          const source = trimmed[frame.index]!
          return {
            input: source.data,
            raw: { width: source.width, height: source.height, channels: source.channels },
            left: frame.x,
            top: frame.y,
          }
        }),
      )
      .png()
      .toBuffer()

    const written = await writeImagePair(composite, `${SCENE_OUT}/character`, `sheet-${sheetIndex}`)
    sheets.push(stripBytes(written))
    log(
      `  sheet  ${sheetIndex}  ${size.width}x${size.height}  ` +
        `${members.length} frames  (${kb(written.bytes)})`,
    )
  }

  const first = trimmed[0]!

  log(`  character: ${trimmed.length} frames @ ${meta.fps}fps across ${sheets.length} sheet(s)`)

  return {
    fps: meta.fps,
    anchor: meta.anchor,
    scale: meta.scale,
    frameWidth: first.fullWidth,
    frameHeight: first.fullHeight,
    sheets,
    frames: packed.frames.map((frame) => {
      const source = trimmed[frame.index]!
      return {
        sheet: frame.sheet,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        offsetX: source.offsetX,
        offsetY: source.offsetY,
      }
    }),
  }
}

// --- plumbing -------------------------------------------------------------------

// --- the site's own pictures ----------------------------------------------------

/**
 * Flatten the scene onto one opaque image, and write the two things that want it.
 *
 * Nothing outside the canvas has ever seen the room whole: it exists as parallax
 * bands that Pixi stacks at runtime, so every consumer that is not the canvas needs
 * it pre-assembled. Two are. `StaticSceneFallback` shows it where WebGL is
 * unavailable, which until now was a hand-written gradient standing in for a painted
 * room (docs/ROADMAP.md Phase 3). And the social card is the same picture cropped —
 * a link to a portfolio should preview as the portfolio.
 *
 * Compositing here rather than exporting a screenshot by hand is the whole point:
 * both are rebuilt by the same `npm run art` that wrote the layers, so neither can
 * quietly describe a room that no longer looks like this.
 *
 * The stack is assembled by the renderer's own rules — band order, then `z` within
 * the band, with objects in front of their band's layer art — and an object is
 * included only if `isDrawnObject` says the canvas draws it. That keeps the
 * billboard's shape-only file out of the picture exactly as it stays out of the
 * scene (components/scene/hotspots.ts § `drawn`), without a second list to maintain.
 */
async function importSiteImages(
  layers: SceneManifest['layers'],
  objects: SceneManifest['objects'],
): Promise<ContentImageManifest['site']> {
  const ground = PALETTES[DEFAULT_PALETTE].ground

  const stack = [...layers, ...objects.filter((object) => isDrawnObject(object.id))].sort(
    (a, b) => BANDS[a.band].z - BANDS[b.band].z || a.z - b.z || a.id.localeCompare(b.id),
  )

  // Read back what this run already wrote, rather than re-reading `art/`: these are
  // normalised to the canvas and the manifest names them, so there is no second
  // place for the draw order or the geometry to be decided.
  const inputs = await Promise.all(
    stack.map(async (item) => ({ input: await readFile(join(PUBLIC_DIR, item.fallback)) })),
  )

  // `flatten` rather than an opaque base canvas: the room's window is transparent and
  // so is everything above the roofline, and a social card with an alpha channel is
  // rendered against whatever colour the platform feels like.
  const flat = await sharp({
    create: {
      width: SCENE_W,
      height: SCENE_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(inputs)
    .flatten({ background: ground })
    .png()
    .toBuffer()

  const composite = await writeImagePair(
    await sharp(flat).resize({ width: COMPOSITE_W }).png().toBuffer(),
    SCENE_OUT,
    'composite',
  )

  // Cropped rather than scaled down whole: the flattened scene has no carousel on
  // the billboard, so the card is framed off it (lib/scene-space.ts § CARD_FRAME).
  const og = await sharp(flat)
    .extract({
      left: CARD_FRAME.x,
      top: CARD_FRAME.y,
      width: CARD_FRAME.width,
      height: Math.round((CARD_FRAME.width * OG_H) / OG_W),
    })
    .resize(OG_W, OG_H)
    .jpeg(CONTENT_JPEG)
    .toBuffer()
  await writeFile(join(IMAGES_DIR, 'og.jpg'), og)

  log(
    `  site   composite  ${COMPOSITE_W}x${Math.round((COMPOSITE_W * SCENE_H) / SCENE_W)}  ` +
      `(${kb(composite.bytes)}), card ${OG_W}x${OG_H} (${kb(og.length)}), ` +
      `${stack.length} layer(s) deep`,
  )

  return {
    composite: stripBytes(composite),
    og: { src: `/${IMAGES_OUT}/og.jpg`, width: OG_W, height: OG_H },
  }
}

function stripBytes<T extends { bytes: number }>(value: T): Omit<T, 'bytes'> {
  const { bytes, ...rest } = value
  void bytes
  return rest
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(0)} KB`
}

async function main(): Promise<void> {
  if (!existsSync(ART_DIR)) {
    throw new Error(`No ${ART_DIR}/ directory. See art/README.md.`)
  }

  log(`Importing ${ART_DIR}/ -> ${OUT_DIR}/ and ${IMAGES_DIR}/`)

  // Clear generated output so a deleted source file cannot leave a stale asset behind
  // that the manifest no longer references but the repository still carries. Both
  // trees are generated in full by this script; nothing else may be filed in them.
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })
  await rm(IMAGES_DIR, { recursive: true, force: true })
  await mkdir(IMAGES_DIR, { recursive: true })

  const tmpDir = join(OUT_DIR, '.tmp')
  await mkdir(tmpDir, { recursive: true })

  const layers = await importLayers()
  const objects = await importObjects()
  const contentImages = await importContentImages()
  checkPostTargets()
  const character = await importCharacter(tmpDir)
  // Last: it composites the layers and objects this run just wrote.
  const site = await importSiteImages(layers, objects)

  await rm(tmpDir, { recursive: true, force: true })

  const generatedAt = new Date().toISOString()

  const manifest: SceneManifest = {
    version: MANIFEST_VERSION,
    generatedAt,
    scene: { width: SCENE_W, height: SCENE_H },
    layers,
    objects,
    character,
  }

  // Two manifests, because they are read by different halves of the site at
  // different times: the scene fetches its own at runtime, and the panels import
  // this one at build time (lib/content-images.ts). Keeping the content images out
  // of the scene manifest also keeps base64 alpha masks out of the panels' bundle.
  const contentImageManifest: ContentImageManifest = {
    generatedAt,
    images: contentImages,
    site,
  }

  await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  await writeFile(
    join(IMAGES_DIR, 'manifest.json'),
    `${JSON.stringify(contentImageManifest, null, 2)}\n`,
  )

  const imageCount = Object.values(contentImages).reduce(
    (total, collection) => total + Object.keys(collection).length,
    0,
  )

  log('')
  log(
    `Wrote ${layers.length} layer(s), ${objects.length} object(s), ` +
      `${imageCount} content image(s), ` +
      `${character ? `${character.frames.length} character frame(s)` : 'no character'}.`,
  )

  if (warnings.length > 0) {
    log('')
    log(`${warnings.length} warning(s):`)
    for (const message of warnings) log(`  ! ${message}`)
  }

  if (layers.length === 0) {
    log('')
    log('No layers found. Drop art into art/background/ and art/foreground/.')
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
