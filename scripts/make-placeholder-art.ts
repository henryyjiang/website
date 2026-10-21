/**
 * `npm run art:placeholders` — generate the art that Henry has not drawn yet, and
 * the drawing template.
 *
 * Three outputs, from one geometry source (lib/scene-layout.ts):
 *
 *   - A placeholder for every band with no real art in it. That is now just the
 *     sky: the room, the skyline and all three objects are Henry's. Placeholders
 *     are deliberately crude, because placeholder art that is obviously placeholder
 *     cannot quietly harden into a design decision (docs/ROADMAP.md).
 *
 *   - `art/objects/billboard.png`, traced out of the skyline rather than drawn.
 *     The billboard is painted into `art/background/skyline.png`, which is fine to
 *     leave there — but a hotspot needs an alpha of its own for its hit area and
 *     its carousel surface, and a flattened city has none. So this reads the lit
 *     surface straight out of the skyline and writes it as the object. Derived, not
 *     hand-maintained: redraw the billboard, re-run this, and it follows.
 *
 *   - `art/TEMPLATE.png`, a full-canvas guide marking the window opening, the
 *     background safe area and the three hotspot footprints, to draw on top of so
 *     real art lines up first try instead of needing a round of position-fixing.
 *     Its rectangles come from lib/scene-layout.ts, which is kept in step with the
 *     art by reading measurements off an import.
 *
 * Safe to re-run: it overwrites only the files it generated, tracked by hash in
 * `art/.placeholders.json`. A file it did not write is left alone and reported, so
 * re-running this can never eat real art.
 */

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

import sharp from 'sharp'

import {
  BACKGROUND_SAFE,
  HOTSPOT_RECTS,
  type Rect,
  SAFE_AREA,
  WINDOW_OPENING,
} from '../lib/scene-layout.ts'
import {
  focalCamera,
  NARROW_WIDTH,
  SCENE_H,
  SCENE_W,
  sceneTransform,
  visibleSlice,
} from '../lib/scene-space.ts'

const ART_DIR = 'art'

/** Marker embedded in every generated file, so we can tell ours from Henry's. */
const MARKER = 'portfolio-placeholder'

function svg(body: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SCENE_W}" height="${SCENE_H}" ` +
      `viewBox="0 0 ${SCENE_W} ${SCENE_H}">${body}</svg>`,
  )
}

function rect(r: Rect, fill: string, extra = ''): string {
  return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${fill}" ${extra}/>`
}

function label(text: string, x: number, y: number, size = 44): string {
  return (
    `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" ` +
    `fill="rgba(255,255,255,0.75)" font-weight="600">${text}</text>`
  )
}

// --- the placeholder set --------------------------------------------------------

type Piece = { path: string; svg: Buffer }

function buildPieces(): Piece[] {
  const pieces: Piece[] = []

  // --- sky, 0.10 ----------------------------------------------------------------
  pieces.push({
    path: join(ART_DIR, 'background', 'sky.png'),
    svg: svg(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0%" stop-color="#0a1230"/>` +
        `<stop offset="60%" stop-color="#1b2b50"/>` +
        `<stop offset="100%" stop-color="#2d3f63"/>` +
        `</linearGradient></defs>` +
        rect({ x: 0, y: 0, width: SCENE_W, height: SCENE_H }, 'url(#g)') +
        label('sky · 0.10 — placeholder', 80, 110),
    ),
  })

  return pieces
}

// --- the billboard surface ------------------------------------------------------

/**
 * The billboard's unlit surface colour, as drawn in `art/background/skyline.png`.
 *
 * Hardcoded, and it fails loudly rather than guessing: if the screen is ever
 * repainted a different colour this script stops and says so, which is a far better
 * failure than silently tracing the wrong shape and moving the carousel somewhere
 * nobody asked for. The fix in that case is either this constant or an exported
 * mask — see art/README.md § The billboard.
 */
const SURFACE_RGB = { r: 255, g: 229, b: 194 }
const SURFACE_TOLERANCE = 14

/** Ignore runs shorter than this, so antialiasing and stray pixels cannot seed a region. */
const MIN_RUN = 24

type Run = { y: number; x0: number; x1: number }

/**
 * Trace the billboard's lit surface out of the skyline art.
 *
 * Row runs rather than a flood fill: the surface is a convex quad drawn in
 * perspective, so every row of it is one contiguous horizontal run, and grouping
 * vertically-adjacent runs that overlap gives the region without a pixel stack. The
 * largest group wins, which is what stops a similarly-coloured sign elsewhere in the
 * city from being mistaken for the billboard.
 */
async function traceBillboardSurface(): Promise<Buffer | null> {
  const source = join(ART_DIR, 'background', 'skyline.png')
  if (!existsSync(source)) return null

  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info

  const matches = (i: number): boolean =>
    data[i + 3]! > 200 &&
    Math.abs(data[i]! - SURFACE_RGB.r) <= SURFACE_TOLERANCE &&
    Math.abs(data[i + 1]! - SURFACE_RGB.g) <= SURFACE_TOLERANCE &&
    Math.abs(data[i + 2]! - SURFACE_RGB.b) <= SURFACE_TOLERANCE

  // Longest qualifying run per row.
  const runs: Run[] = []
  for (let y = 0; y < height; y++) {
    let best: Run | null = null
    let start = -1
    for (let x = 0; x <= width; x++) {
      const on = x < width && matches((y * width + x) * channels)
      if (on && start < 0) start = x
      if (!on && start >= 0) {
        if (x - start >= MIN_RUN && (!best || x - start > best.x1 - best.x0)) {
          best = { y, x0: start, x1: x - 1 }
        }
        start = -1
      }
    }
    if (best) runs.push(best)
  }

  // Group vertically-adjacent runs that overlap horizontally; keep the biggest.
  let group: Run[] = []
  let current: Run[] = []
  const area = (g: Run[]) => g.reduce((n, r) => n + (r.x1 - r.x0 + 1), 0)

  for (const run of runs) {
    const last = current[current.length - 1]
    const joins = last && run.y === last.y + 1 && run.x1 >= last.x0 && run.x0 <= last.x1
    if (joins) {
      current.push(run)
    } else {
      if (area(current) > area(group)) group = current
      current = [run]
    }
  }
  if (area(current) > area(group)) group = current

  if (group.length < 64) return null

  // The source pixels, not a flat fill of SURFACE_RGB. The object draws directly over
  // the copy still in the skyline, so copying makes the two bit-identical and the
  // object provably invisible — a constant leaves a few levels of tint difference
  // across a large flat field, which is exactly where banding shows up. It also means
  // any texture or gradient Henry adds to the surface comes along for free.
  const out = Buffer.alloc(SCENE_W * SCENE_H * 4, 0)
  for (const run of group) {
    for (let x = run.x0; x <= run.x1; x++) {
      const from = (run.y * width + x) * channels
      const to = (run.y * SCENE_W + x) * 4
      out[to] = data[from]!
      out[to + 1] = data[from + 1]!
      out[to + 2] = data[from + 2]!
      out[to + 3] = 255
    }
  }

  const top = group[0]!
  const bottom = group[group.length - 1]!
  process.stdout.write(
    `  trace  billboard surface: ${group.length} rows, ` +
      `y ${top.y}–${bottom.y}, top edge ${top.x0}–${top.x1}\n`,
  )

  return sharp(out, { raw: { width: SCENE_W, height: SCENE_H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

// --- the template ---------------------------------------------------------------

/** A reference phone, for drawing the slice a narrow viewport actually gets. */
const PHONE = { width: 375, height: 812 }

/** Rounded, because it is a drawn guide and sub-pixel precision reads as noise. */
const PHONE_SLICE = (() => {
  const transform = sceneTransform(PHONE.width, PHONE.height)
  const slice = visibleSlice(PHONE.width, PHONE.height, focalCamera(transform))
  return {
    x: Math.round(slice.x),
    y: Math.round(slice.y),
    width: Math.round(slice.width),
    height: Math.round(slice.height),
  }
})()

function buildTemplate(): Buffer {
  // Labels are clamped into the canvas. The background safe area starts within a few
  // pixels of the top edge — 15% bleed on a 1040px opening nearly fills the canvas —
  // so an unclamped label above it would render off-frame and be invisible.
  const guide = (r: Rect, colour: string, dash: string, text: string, textY: number) => {
    const y = Math.min(Math.max(textY, 48), SCENE_H - 120)
    const x = Math.min(Math.max(r.x + 16, 16), SCENE_W - 900)
    return (
      `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="none" ` +
      `stroke="${colour}" stroke-width="6" stroke-dasharray="${dash}"/>` +
      `<text x="${x}" y="${y}" font-family="Helvetica, Arial, sans-serif" ` +
      `font-size="34" font-weight="700" fill="${colour}">${text}</text>`
    )
  }

  const thirds = [1, 2]
    .flatMap((i) => [
      `<line x1="${(SCENE_W / 3) * i}" y1="0" x2="${(SCENE_W / 3) * i}" y2="${SCENE_H}" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>`,
      `<line x1="0" y1="${(SCENE_H / 3) * i}" x2="${SCENE_W}" y2="${(SCENE_H / 3) * i}" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>`,
    ])
    .join('')

  return svg(
    rect({ x: 0, y: 0, width: SCENE_W, height: SCENE_H }, '#101624') +
      thirds +
      // Canvas edge.
      `<rect x="3" y="3" width="${SCENE_W - 6}" height="${SCENE_H - 6}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="6"/>` +
      guide(SAFE_AREA, '#ffffff', '2 14', 'always-visible safe area — keep anything important inside', SAFE_AREA.y + 56) +
      guide(BACKGROUND_SAFE, '#4ec9a0', '4 18', 'background safe area — draw sky/skyline out to here', BACKGROUND_SAFE.y + 56) +
      guide(WINDOW_OPENING, '#6cc6ff', '24 14', 'window opening — transparent in room art', WINDOW_OPENING.y + 56) +
      guide(HOTSPOT_RECTS.desk, '#ffb454', '12 10', 'desk hotspot', HOTSPOT_RECTS.desk.y - 16) +
      guide(HOTSPOT_RECTS.bed, '#ffb454', '12 10', 'bed hotspot', HOTSPOT_RECTS.bed.y - 16) +
      guide(HOTSPOT_RECTS.billboard, '#ff8fb1', '12 10', 'billboard hotspot', HOTSPOT_RECTS.billboard.y - 16) +
      guide(
        PHONE_SLICE,
        '#c792ea',
        '18 12',
        `phone framing — where a ${PHONE.width} x ${PHONE.height} screen opens; ` +
          `under ${NARROW_WIDTH}px the rest of the room is a swipe away`,
        // Down the middle of the canvas: the top of this guide is where four other
        // labels already are, and a legend that cannot be read is not a legend.
        SCENE_H / 2,
      ) +
      `<text x="80" y="${SCENE_H - 70}" font-family="Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="rgba(255,255,255,0.8)">` +
      `${SCENE_W} x ${SCENE_H} design canvas — export every layer at this size, transparent where nothing is drawn` +
      `</text>`,
  )
}

// --- main -----------------------------------------------------------------------

/**
 * Record of what this script last wrote, as content hashes.
 *
 * Ownership is tracked in a sidecar rather than in PNG metadata because sharp does
 * not round-trip PNG text chunks — `withMetadata({ comments })` writes nothing that
 * `metadata()` reads back, so a marker embedded in the file is unverifiable. Hashing
 * what we wrote is independent of the encoder.
 *
 * Committed, so the check still works on a fresh clone.
 */
const LEDGER_PATH = join(ART_DIR, '.placeholders.json')

type Ledger = { marker: string; files: Record<string, string> }

async function readLedger(): Promise<Ledger> {
  if (!existsSync(LEDGER_PATH)) return { marker: MARKER, files: {} }
  try {
    return JSON.parse(await readFile(LEDGER_PATH, 'utf8')) as Ledger
  } catch {
    return { marker: MARKER, files: {} }
  }
}

function hash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Ours to overwrite if we wrote it and nobody has touched it since.
 *
 * A file whose hash has drifted from the ledger is real art that replaced a
 * placeholder, and overwriting it would destroy work.
 */
async function isOurs(path: string, ledger: Ledger): Promise<boolean> {
  if (!existsSync(path)) return true
  const recorded = ledger.files[path]
  if (!recorded) return false
  return hash(await readFile(path)) === recorded
}

async function write(
  path: string,
  source: Buffer,
  ledger: Ledger,
): Promise<'written' | 'skipped'> {
  if (!(await isOurs(path, ledger))) {
    process.stdout.write(`  skip   ${path}  (your art, not a placeholder — left alone)\n`)
    return 'skipped'
  }

  await mkdir(join(path, '..'), { recursive: true })
  const encoded = await sharp(source).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(path, encoded)
  ledger.files[path] = hash(encoded)

  process.stdout.write(`  write  ${path}\n`)
  return 'written'
}

async function main(): Promise<void> {
  process.stdout.write('Generating placeholder art and template\n')

  const ledger = await readLedger()

  let written = 0
  let skipped = 0

  for (const piece of buildPieces()) {
    const result = await write(piece.path, piece.svg, ledger)
    if (result === 'written') written++
    else skipped++
  }

  // The billboard's object art is traced out of the skyline rather than drawn, so
  // it is generated here alongside the placeholders and protected by the same
  // ledger — if Henry ever exports his own, this leaves it alone.
  const surface = await traceBillboardSurface()
  if (surface) {
    const result = await write(join(ART_DIR, 'objects', 'billboard.png'), surface, ledger)
    if (result === 'written') written++
    else skipped++
  } else {
    process.stdout.write(
      '  warn   could not find the billboard surface in art/background/skyline.png\n' +
        '         (looking for the flat fill at rgb(255,229,194)) — left as it was\n',
    )
  }

  // The template is always regenerated: it is a guide, not art, and it must track
  // lib/scene-layout.ts rather than whatever the geometry was last time.
  const templatePath = join(ART_DIR, 'TEMPLATE.png')
  await mkdir(ART_DIR, { recursive: true })
  const template = await sharp(buildTemplate()).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(templatePath, template)
  ledger.files[templatePath] = hash(template)
  process.stdout.write(`  write  ${templatePath}\n`)

  await writeFile(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`)

  process.stdout.write(`\n${written} written, ${skipped} left alone. Now run: npm run art\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
