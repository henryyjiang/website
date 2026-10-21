/**
 * The blog — one source, two surfaces.
 *
 * The billboard carousel in the scene reads the most recent few; /updates lists all
 * of them. The billboard must never hold its own copy, which is the whole reason
 * this file exists rather than the headlines being written into the scene.
 *
 * **The carousel only shows posts that have a picture**, which means posts with a
 * `target` that resolves to one. The billboard's screen is not painted into the city
 * any more, so there is no unlit surface for a headline to sit on; a post with
 * nothing to project is listed on /updates and skipped up there.
 *
 * `title` is constrained by the billboard: it has to read as large, brief text at a
 * distance, so keep it to a headline and put prose in `body`. `body` is constrained
 * by the panel, which is a condensed feed of news links rather than a page of
 * articles — one line each. Anything wanting a paragraph is a project in
 * `projects.ts` or a piece in `art.ts`, and the post points at it.
 *
 * **A post points inward.** `target` names the Coding entry or the Art piece the
 * post is about, by that thing's own slug, and the panel turns it into a link that
 * scrolls the Coding list to that row or opens that piece in the Art popup. That is
 * what makes the blog worth having next to the other two tabs instead of repeating
 * them. `npm run art` checks every one of those slugs.
 *
 * **Posts do not get their own URLs.** The blog is one page holding a series of
 * posts, so `slug` is a join key and never a route segment — it ties a post to its
 * image at `art/posts/<slug>.png` and has to stay stable for that reason alone.
 * The route stays /updates so links already shared keep working; the nav labels it
 * News, renamed from "Blog" on 2026-10-21 because an entry here is a notice
 * pointing elsewhere rather than an article.
 *
 * SEED CONTENT. These entries describe the rebuild itself, because the feed needs
 * something real to render before Henry writes his own. Replace them.
 *
 * See docs/CONTENT.md.
 */

import type { Post } from './types'

export const POSTS: readonly Post[] = [
  {
    // Rewrite this when the News tab gets its pass — the copy is a placeholder, the
    // piece it points at is not. It is also the one link the blog has that nothing
    // else does: a post opening a piece in the Art popup rather than navigating to
    // a page, so keep a post pointing at a piece here.
    slug: 'first-animation',
    date: '2026-10-21',
    title: 'My first animation',
    body: 'Five shots of line animation, start to finish.',
    target: { to: 'piece', slug: 'my-first-animation' },
  },
  {
    slug: 'rebuilding-the-site',
    date: '2026-10-17',
    title: 'Rebuilding the site',
    body: 'Starting over with a painted apartment, a real parallax scene, and an animation pipeline that survives a tab switch.',
  },
  {
    // Was "Three quant models shipped", pointing at the Hawkes/kinetic entry. That
    // entry came off the Coding tab on 2026-10-21 and two of the three models it
    // named are no longer on the site, so this points at what is: the combined
    // QuantConnect row. Rewritten rather than deleted because the thing it
    // announces still happened and is still listed.
    slug: 'quantconnect-models',
    date: '2026-05-11',
    title: 'Two models on QuantConnect',
    body: 'A quantum walk macro equity model and a fractal volatility options strategy, both published.',
    target: { to: 'project', slug: 'quantconnect-models' },
  },
]

/** What the billboard shows. Few enough to cycle through before anyone gets bored. */
export const BILLBOARD_COUNT = 3
