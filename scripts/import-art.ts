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
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import process from 'node:process'

import sharp from 'sharp'

import { BANDS, type BandId } from '../components/scene/bands.ts'
import { type HotspotId } from '../lib/scene-layout.ts'
import { MANIFEST_VERSION, type SceneManifest } from '../lib/scene-manifest.ts'
import { SCENE_H, SCENE_W } from '../lib/scene-space.ts'
import { packFrames } from './lib/pack.ts'

// --- configuration --------------------------------------------------------------

const ART_DIR = 'art'
const OUT_DIR = join('public', 'scene')

/** Lossy WebP with alpha. Painted art tolerates this well and it is far smaller. */
const WEBP = { quality: 82, effort: 5, alphaQuality: 90 } as const
const PNG = { compressionLevel: 9 } as const

/** Mask cell size in scene units. 8 gives 320 x 180 cells over the canvas. */
const MASK_SCALE = 8

/** Per-layer budget from docs/ANIMATION.md. Exceeding it warns rather than fails. */
const LAYER_BUDGET_BYTES = 400 * 1024

/** Which folder maps to which parallax band. */
const BAND_DIRS: Record<string, BandId> = {
  'background/sky': 'sky',
  'background/skyline': 'skyline',
  'foreground/room': 'room',
  'foreground/near': 'near',
}

/**
 * Which band each clickable object lives in.
 *
 * The billboard is the odd one: it is seen through the glass, so it travels at the
 * skyline's parallax factor rather than the room's (docs/DESIGN.md).
 */
const OBJECT_BANDS: Record<HotspotId, BandId> = {
  desk: 'room',
  art: 'room',
  billboard: 'skyline',
}

/** Objects draw in front of their band's layer art. */
const OBJECT_Z = 1000

const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg'])

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
 * code edit. Without a prefix the layer still imports; it just sorts last and says so.
 */
function parseLayerName(file: string): { z: number; id: string } {
  const stem = basename(file, extname(file))
  const match = /^(\d+)[-_](.+)$/.exec(stem)
  if (!match) {
    warn(
      `"${file}" has no NN- ordering prefix, so its draw order is undefined. ` +
        `Rename it like "20-${stem}.png". See art/README.md.`,
    )
    return { z: Number.MAX_SAFE_INTEGER, id: stem }
  }
  return { z: Number.parseInt(match[1]!, 10), id: match[2]! }
}

async function listImages(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return []
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(extname(e.name).toLowerCase()))
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

/** Write both encodings and report the pair. */
async function writeImagePair(
  buffer: Buffer,
  outSubdir: string,
  id: string,
): Promise<{ src: string; fallback: string; width: number; height: number; bytes: number }> {
  const dir = join(OUT_DIR, outSubdir)
  await mkdir(dir, { recursive: true })

  const webp = await sharp(buffer).webp(WEBP).toBuffer()
  const png = await sharp(buffer).png(PNG).toBuffer()
  const meta = await sharp(buffer).metadata()

  await writeFile(join(dir, `${id}.webp`), webp)
  await writeFile(join(dir, `${id}.png`), png)

  return {
    src: `/scene/${outSubdir}/${id}.webp`,
    fallback: `/scene/${outSubdir}/${id}.png`,
    width: meta.width ?? SCENE_W,
    height: meta.height ?? SCENE_H,
    bytes: webp.length,
  }
}

// --- layers ---------------------------------------------------------------------

async function importLayers(): Promise<SceneManifest['layers']> {
  const layers: SceneManifest['layers'] = []

  for (const [relative, band] of Object.entries(BAND_DIRS)) {
    const dir = join(ART_DIR, relative)
    const files = await listImages(dir)

    for (const file of files) {
      const { z, id } = parseLayerName(file)
      const label = `${relative}/${file}`

      const source = await normaliseToCanvas(await readFile(join(dir, file)), label)
      const written = await writeImagePair(source, 'layers', `${band}-${id}`)

      if (written.bytes > LAYER_BUDGET_BYTES) {
        warn(
          `${label} is ${kb(written.bytes)} as WebP, over the ${kb(LAYER_BUDGET_BYTES)} ` +
            `per-layer budget in docs/ANIMATION.md.`,
        )
      }

      layers.push({ id: `${band}-${id}`, band, z, ...stripBytes(written) })
      log(`  layer  ${band.padEnd(8)} z=${String(z).padStart(4)}  ${id}  (${kb(written.bytes)})`)
    }
  }

  // Back to front: band order first, then z within the band.
  layers.sort((a, b) => BANDS[a.band].z - BANDS[b.band].z || a.z - b.z)
  return layers
}

// --- objects --------------------------------------------------------------------

/**
 * Measure a 1-bit alpha mask and the art's tight bounds.
 *
 * Both are derived from the art rather than declared in code, so a redrawn object
 * brings its own hit area with it and the two can never drift apart. An alpha of 128
 * is the threshold — anti-aliased edges below half opacity are not worth clicking.
 */
async function measureAlpha(buffer: Buffer): Promise<{
  mask: { scale: number; width: number; height: number; bits: string }
  bounds: { x: number; y: number; width: number; height: number }
}> {
  const width = Math.ceil(SCENE_W / MASK_SCALE)
  const height = Math.ceil(SCENE_H / MASK_SCALE)

  // Downsampling averages alpha, so a cell counts as solid if its average clears a
  // low bar. That deliberately errs toward slightly generous hit areas: a hover that
  // triggers a few pixels early is unnoticeable, one that fails on an object's edge
  // feels broken.
  const { data } = await sharp(buffer)
    .resize(width, height, { fit: 'fill', kernel: 'cubic' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const bytes = new Uint8Array(Math.ceil((width * height) / 8))
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]!
      if (alpha < 40) continue

      const i = y * width + x
      bytes[i >> 3]! |= 1 << (7 - (i & 7))

      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  const empty = maxX < 0
  return {
    mask: {
      scale: MASK_SCALE,
      width,
      height,
      bits: Buffer.from(bytes).toString('base64'),
    },
    bounds: empty
      ? { x: 0, y: 0, width: 0, height: 0 }
      : {
          x: minX * MASK_SCALE,
          y: minY * MASK_SCALE,
          width: (maxX - minX + 1) * MASK_SCALE,
          height: (maxY - minY + 1) * MASK_SCALE,
        },
  }
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
    const written = await writeImagePair(source, 'objects', hotspot)
    const { mask, bounds } = await measureAlpha(source)

    if (bounds.width === 0) {
      warn(`art/objects/${file} is fully transparent, so it can never be clicked.`)
    }

    objects.push({
      id: hotspot,
      band: OBJECT_BANDS[hotspot],
      z: OBJECT_Z,
      bounds,
      mask,
      ...stripBytes(written),
    })

    log(
      `  object ${OBJECT_BANDS[hotspot].padEnd(8)}        ${hotspot}  ` +
        `(${kb(written.bytes)}, hit area ${bounds.width}x${bounds.height})`,
    )
  }

  for (const id of Object.keys(OBJECT_BANDS)) {
    if (!seen.has(id)) {
      warn(`No art/objects/${id}.png, so the "${id}" hotspot has nothing to click.`)
    }
  }

  return objects
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

    const written = await writeImagePair(composite, 'character', `sheet-${sheetIndex}`)
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

  log(`Importing ${ART_DIR}/ -> ${OUT_DIR}/`)

  // Clear generated output so a deleted source file cannot leave a stale asset behind
  // that the manifest no longer references but the repository still carries.
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  const tmpDir = join(OUT_DIR, '.tmp')
  await mkdir(tmpDir, { recursive: true })

  const layers = await importLayers()
  const objects = await importObjects()
  const character = await importCharacter(tmpDir)

  await rm(tmpDir, { recursive: true, force: true })

  const manifest: SceneManifest = {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    scene: { width: SCENE_W, height: SCENE_H },
    layers,
    objects,
    character,
  }

  await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  log('')
  log(
    `Wrote ${layers.length} layer(s), ${objects.length} object(s), ` +
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
