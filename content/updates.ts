/**
 * The changelog — one source, two surfaces.
 *
 * The billboard carousel in the scene reads the most recent few; /updates lists all
 * of them. The billboard must never hold its own copy, which is the whole reason
 * this file exists rather than the headlines being written into the scene.
 *
 * `title` is constrained by the billboard: it has to read as large, brief text at a
 * distance, so keep it to a headline and put prose in `body`.
 *
 * SEED CONTENT. These entries describe the rebuild itself, because the feed needs
 * something real to render before Henry writes his own. Replace them.
 *
 * See docs/CONTENT.md.
 */

import type { Update } from './types'

export const UPDATES: readonly Update[] = [
  {
    date: '2026-10-17',
    title: 'Rebuilding the site',
    body: 'Starting over on the portfolio with a proper scene renderer. New apartment layout with a city skyline, and an animation pipeline that does not fall apart when you switch tabs.',
  },
  {
    date: '2026-05-11',
    title: 'Three quant models shipped',
    body: 'Hawkes process market making, a quantum walk BQP macro model, and the kinetic queue prediction strategy.',
  },
  {
    date: '2026-04-07',
    title: 'fwubbo dashboard',
    body: 'A personal dashboard that streams the Claude API to build its own widgets.',
    href: 'https://github.com/henryyjiang/fwubbo',
  },
  {
    date: '2026-02-02',
    title: 'Darwin preprint on arXiv',
    body: 'The self-modifying agent work went up as a preprint.',
    href: 'http://arxiv.org/abs/2602.05848',
  },
]

/** What the billboard shows. Few enough to cycle through before anyone gets bored. */
export const BILLBOARD_COUNT = 3
