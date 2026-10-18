/**
 * Drawing and animation work. Surfaced in the art panel.
 *
 * EMPTY ON PURPOSE. This collection has no equivalent on the old site — the art was
 * represented only by a link out to TikTok, so there is nothing to carry over and
 * nothing here is invented.
 *
 * Henry fills this. The panel that renders it is Phase 4, and how it should be
 * presented is an open question in docs/ROADMAP.md: a grid and a reel want different
 * data, so the shape below may need revisiting once that is decided.
 *
 * Images go under public/ (or art/ if they should go through the import pipeline —
 * they shouldn't, these are portfolio images, not scene layers).
 */

import type { ArtPiece } from './types'

export const ART_PIECES: readonly ArtPiece[] = []
