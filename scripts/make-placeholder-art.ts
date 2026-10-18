/**
 * `npm run art:placeholders` — generate the Phase 2 placeholder art and the drawing
 * template.
 *
 * Two outputs, from one geometry source (lib/scene-layout.ts):
 *
 *   - Placeholder layers and objects written into `art/`, so the import pipeline has
 *     real files to chew on and the scene has something to render. They are
 *     deliberately crude: placeholder art that is obviously placeholder cannot
 *     quietly harden into a design decision (docs/ROADMAP.md).
 *
 *   - `art/TEMPLATE.png`, a full-canvas guide marking the window opening, the
 *     background safe area and the three hotspot footprints, to draw on top of so
 *     real art lines up first try instead of needing a round of position-fixing.
 *
 * Safe to re-run: it overwrites only the files it generated. Once Henry replaces a
 * file with real art, running this again would overwrite it, so it warns about any
 * file it is about to replace that it did not write itself.
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
import { SCENE_H, SCENE_W } from '../lib/scene-space.ts'

const ART_DIR = 'art'

/** Marker embedded in every generated file, so we can tell ours from Henry's. */
const MARKER = 'portfolio-placeholder'

const W = WINDOW_OPENING

function svg(body: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SCENE_W}" height="${SCENE_H}" ` +
      `viewBox="0 0 ${SCENE_W} ${SCENE_H}">${body}</svg>`,
  )
}

function rect(r: Rect, fill: string, extra = ''): string {
  return `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${fill}" ${extra}/>`
}

/** Diagonal hatching, so a placeholder cannot be mistaken for finished art. */
function hatch(id: string, colour: string): string {
  return (
    `<pattern id="${id}" width="48" height="48" patternTransform="rotate(45)" ` +
    `patternUnits="userSpaceOnUse">` +
    `<rect width="48" height="48" fill="${colour}"/>` +
    `<line x1="0" y1="0" x2="0" y2="48" stroke="rgba(255,255,255,0.10)" stroke-width="18"/>` +
    `</pattern>`
  )
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
    path: join(ART_DIR, 'background', 'sky', '10-gradient.png'),
    svg: svg(
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0%" stop-color="#0a1230"/>` +
        `<stop offset="60%" stop-color="#1b2b50"/>` +
        `<stop offset="100%" stop-color="#2d3f63"/>` +
        `</linearGradient></defs>` +
        rect({ x: 0, y: 0, width: SCENE_W, height: SCENE_H }, 'url(#g)') +
        label('sky · 0.10', 80, 110),
    ),
  })

  // --- skyline, 0.30 ------------------------------------------------------------
  // Blocks at varied heights so the band's own travel is readable, not just its
  // travel relative to the room. Drawn across the background safe area so panning
  // cannot expose an edge through the opening.
  const blocks: Rect[] = [
    { x: 180, y: 640, width: 300, height: 800 },
    { x: 520, y: 460, width: 240, height: 980 },
    { x: 820, y: 700, width: 180, height: 740 },
    { x: 1480, y: 580, width: 280, height: 860 },
    { x: 1800, y: 720, width: 340, height: 720 },
    { x: 2180, y: 620, width: 260, height: 820 },
  ]

  pieces.push({
    path: join(ART_DIR, 'background', 'skyline', '10-far-blocks.png'),
    svg: svg(
      `<defs>${hatch('h', '#24395c')}</defs>` +
        blocks.map((b) => rect(b, 'url(#h)')).join('') +
        label('skyline · 0.30', 80, SCENE_H - 60),
    ),
  })

  // The skyscraper carrying the billboard. A separate layer from the far blocks so
  // the billboard object has something to sit on that moves with it.
  pieces.push({
    path: join(ART_DIR, 'background', 'skyline', '20-tower.png'),
    svg: svg(
      `<defs>${hatch('t', '#35507a')}</defs>` +
        rect({ x: 1000, y: 240, width: 420, height: SCENE_H - 240 }, 'url(#t)') +
        rect({ x: 1000, y: 240, width: 420, height: 8 }, 'rgba(255,255,255,0.25)'),
    ),
  })

  // --- room, 1.00 ---------------------------------------------------------------
  // The interior is a frame around the opening, not a filled rectangle with a hole
  // cut out: four rects need no path operations and leave the opening genuinely
  // transparent, so the bands behind it composite through. That transparency is the
  // window — nothing masks the skyline to this shape.
  pieces.push({
    path: join(ART_DIR, 'foreground', 'room', '10-walls.png'),
    svg: svg(
      `<defs>${hatch('w', '#5e4433')}</defs>` +
        rect({ x: 0, y: 0, width: SCENE_W, height: W.y }, 'url(#w)') +
        rect(
          { x: 0, y: W.y + W.height, width: SCENE_W, height: SCENE_H - (W.y + W.height) },
          'url(#w)',
        ) +
        rect({ x: 0, y: W.y, width: W.x, height: W.height }, 'url(#w)') +
        rect(
          { x: W.x + W.width, y: W.y, width: SCENE_W - (W.x + W.width), height: W.height },
          'url(#w)',
        ) +
        label('room · 1.00 — opening is transparent', 80, 110),
    ),
  })

  pieces.push({
    path: join(ART_DIR, 'foreground', 'room', '20-mullions.png'),
    svg: svg(
      rect({ x: 990, y: W.y, width: 26, height: W.height }, '#7a5b43') +
        rect({ x: 1560, y: W.y, width: 26, height: W.height }, '#7a5b43') +
        rect({ x: W.x, y: W.y, width: W.width, height: 18 }, '#7a5b43') +
        rect({ x: W.x, y: W.y + W.height - 18, width: W.width, height: 18 }, '#7a5b43'),
    ),
  })

  // --- near, 1.15 ---------------------------------------------------------------
  // Drawn past the canvas edges on purpose: a band above 1.00 travels further than
  // the overflow that hides it, so without bleed its edge slides into view at the
  // extremes of a pan. bandBleed() in lib/scene-space.ts is the number.
  pieces.push({
    path: join(ART_DIR, 'foreground', 'near', '10-floor.png'),
    svg: svg(
      `<defs>${hatch('n', '#2e211c')}</defs>` +
        rect({ x: -200, y: 1280, width: SCENE_W + 400, height: 400 }, 'url(#n)') +
        label('near · 1.15', 80, SCENE_H - 40),
    ),
  })

  // --- objects ------------------------------------------------------------------
  // Full canvas with transparency around the shape, like every other layer, so the
  // object sits exactly where it belongs. Each gets a non-rectangular silhouette so
  // that alpha-accurate hit testing has something to actually prove: a rectangle
  // around these would catch empty air.
  const desk = HOTSPOT_RECTS.desk
  pieces.push({
    path: join(ART_DIR, 'objects', 'desk.png'),
    svg: svg(
      `<defs>${hatch('d', '#9c6f4a')}</defs>` +
        // Monitor on top, desktop below, legs — an L-ish silhouette, not a box.
        rect({ x: desk.x + 120, y: desk.y, width: 360, height: 190 }, 'url(#d)', 'rx="12"') +
        rect({ x: desk.x + 270, y: desk.y + 190, width: 60, height: 50 }, '#7d5637') +
        rect({ x: desk.x, y: desk.y + 240, width: desk.width, height: 44 }, 'url(#d)') +
        rect({ x: desk.x + 30, y: desk.y + 284, width: 40, height: 76 }, '#7d5637') +
        rect({ x: desk.x + desk.width - 70, y: desk.y + 284, width: 40, height: 76 }, '#7d5637'),
    ),
  })

  const art = HOTSPOT_RECTS.art
  pieces.push({
    path: join(ART_DIR, 'objects', 'art.png'),
    svg: svg(
      `<defs>${hatch('a', '#a8864f')}</defs>` +
        // Easel: canvas panel plus splayed legs.
        rect({ x: art.x + 40, y: art.y, width: 320, height: 240 }, 'url(#a)', 'rx="8"') +
        `<polygon points="${art.x + 70},${art.y + 240} ${art.x + 110},${art.y + 240} ${art.x + 150},${art.y + 420} ${art.x + 110},${art.y + 420}" fill="#8a6b3c"/>` +
        `<polygon points="${art.x + 290},${art.y + 240} ${art.x + 330},${art.y + 240} ${art.x + 290},${art.y + 420} ${art.x + 250},${art.y + 420}" fill="#8a6b3c"/>` +
        rect({ x: art.x + 120, y: art.y + 330, width: 160, height: 20 }, '#8a6b3c'),
    ),
  })

  // The billboard lives in the skyline band — seen through the glass, parallaxing
  // with the city rather than the room (docs/DESIGN.md). The area where headlines go
  // is left clear: the text is rendered live from content/updates.ts, not painted in.
  const bb = HOTSPOT_RECTS.billboard
  pieces.push({
    path: join(ART_DIR, 'objects', 'billboard.png'),
    svg: svg(
      rect(bb, '#6f64b8', 'rx="6"') +
        rect({ x: bb.x + 14, y: bb.y + 14, width: bb.width - 28, height: bb.height - 70 }, '#2b2550') +
        // Support legs down to the tower.
        rect({ x: bb.x + 60, y: bb.y + bb.height, width: 26, height: 120 }, '#5a5196') +
        rect({ x: bb.x + bb.width - 86, y: bb.y + bb.height, width: 26, height: 120 }, '#5a5196'),
    ),
  })

  return pieces
}

// --- the template ---------------------------------------------------------------

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
      guide(HOTSPOT_RECTS.art, '#ffb454', '12 10', 'art hotspot', HOTSPOT_RECTS.art.y - 16) +
      guide(HOTSPOT_RECTS.billboard, '#ff8fb1', '12 10', 'billboard hotspot', HOTSPOT_RECTS.billboard.y - 16) +
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
