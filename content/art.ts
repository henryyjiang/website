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
    slug: 'current-wip-animation',
    title: 'Current WIP Animation',
    date: '2026-10-21',
    medium: '2D animation',
    caption:
      'Four shots of colour animation, in progress: a figure seen from below on a ' +
      'rooftop against a blue sky, a close pass across a train window, carriages ' +
      'tumbling loose over a city, and two characters in close-up against white.',
  },
  {
    slug: 'my-first-animation',
    title: 'My First Animation!',
    date: '2025-07-09',
    medium: '2D animation',
    caption:
      'Five shots of black-and-white line animation: a close-up of a player mid-turn, ' +
      'two figures colliding in the air over speed lines, a ball rising into a dark sky ' +
      'behind a cyan trail, a sweeping kick drawn as a fan of strokes, and a panel grid ' +
      'of faces reacting.',
  },
]
