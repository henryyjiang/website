/**
 * Drawing and animation work. Surfaced in the art panel.
 *
 * Henry fills this. Adding a piece is two steps and no code:
 *
 *   1. export the image to `art/pieces/<slug>.png` — or a video to `<slug>.mp4`
 *   2. add an entry below with that `slug`, a title and a date
 *
 * Then `npm run art`. The file is optimised into `public/images/pieces/` and resolved
 * by slug, which is why no entry writes a path. **Whether a piece is a drawing or an
 * animation is decided by the file, not by this entry**: a video is transcoded, a
 * poster frame is pulled out of it for the grid, and the popup plays it. `medium` is
 * a note for the reader, never a format switch. A piece whose slug has no file still
 * lists — the import warns and the panel renders the text.
 *
 * The presentation is settled: a grid of wide 16:9 cards, each opening a popup over
 * the whole page on the glitch transition. Two fields here are **not displayed**:
 * `caption` is the image's alt text, and `date` only orders the grid. See
 * docs/DESIGN.md § Panel interiors and docs/CONTENT.md.
 */

import type { ArtPiece } from './types'

export const ART_PIECES: readonly ArtPiece[] = [
  {
    // FILLER — this is a crop of the scene's own skyline layer, not a portfolio
    // piece. It is here to prove an image piece renders: thumbnail, popup, caption.
    // Delete it when real drawings arrive.
    slug: 'night-window',
    title: 'Night window study',
    date: '2026-10-20',
    medium: '2D',
    caption: 'FILLER — a crop of the scene art, standing in for a real piece.',
  },
]
