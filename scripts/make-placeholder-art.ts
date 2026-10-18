/**
 * `npm run art:placeholders` — generate the art that Henry has not drawn yet, and
 * the drawing template.
 *
 * Two outputs, from one geometry source (lib/scene-layout.ts):
 *
 *   - A placeholder for every band with no real art in it. That is now just the
 *     sky: the room, the skyline and all three objects are Henry's. Placeholders
 *     are deliberately crude, because placeholder art that is obviously placeholder
 *     cannot quietly harden into a design decision (docs/ROADMAP.md).
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
import { focalSlice, NARROW_WIDTH, SCENE_H, SCENE_W } from '../lib/scene-space.ts'

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

// --- the template ---------------------------------------------------------------

/** A reference phone, for drawing the slice a narrow viewport actually gets. */
const PHONE = { width: 375, height: 812 }

/** Rounded, because it is a drawn guide and sub-pixel precision reads as noise. */
const PHONE_SLICE = (() => {
  const slice = focalSlice(PHONE.width, PHONE.height)
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
        `phone framing — all a ${PHONE.width} x ${PHONE.height} screen sees ` +
          `(anything under ${NARROW_WIDTH}px is a slice like this)`,
        PHONE_SLICE.y + 110,
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
