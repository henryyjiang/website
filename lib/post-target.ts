/**
 * Where a blog post's `target` points, as a URL.
 *
 * The blog links *inward*: a post is a notice that something happened, and the thing
 * that happened is nearly always already on the site (docs/DESIGN.md § Panel
 * interiors). This is the one place that knows what the two inward targets look like
 * as routes, which matters because both of them are claims about another panel's
 * markup:
 *
 *   - `project` relies on the Coding panel giving every row the id `project-<slug>`
 *   - `piece`   relies on the Art panel reading `?piece=<slug>` and opening it
 *
 * Those are the only two couplings between panels on the site, and `postAnchorId`
 * below is a third of the same kind whose other end is the scene rather than a
 * panel. Keeping them in named functions rather than interpolated at the call sites
 * is what makes them findable from either end — and `npm run art` checks that every
 * slug on this side exists on the other.
 */

import type { PostTarget } from '@/content/types'

/** The id a Coding row carries, so a post can scroll to it. */
export function projectAnchorId(slug: string): string {
  return `project-${slug}`
}

/**
 * The id a *feed* row carries, so the billboard can scroll to it.
 *
 * The same shape as `projectAnchorId` and here for the same reason, but the arrow
 * points the other way and starts outside the DOM: the billboard in the scene is
 * showing one post at a time, and clicking it should land on that post rather than
 * at the top of the News tab (Henry, 2026-10-22 — the About section above the feed
 * is tall enough that the top of the tab is nowhere near what he clicked).
 *
 * So this is a third coupling, and the only one whose other end is Pixi:
 * `components/scene/SceneCanvas.tsx` builds the href from the slug the carousel
 * publishes, and `app/updates/page.tsx` puts this id on every row of the feed.
 * Nothing in the scene reaches into the DOM to do it — the slug crosses through the
 * store like everything else (docs/ARCHITECTURE.md § The Pixi / React boundary).
 */
export function postAnchorId(slug: string): string {
  return `post-${slug}`
}

/** The search param the Art panel opens its popup from. */
export const PIECE_PARAM = 'piece'

export function postHref(target: PostTarget): string {
  switch (target.to) {
    case 'project':
      return `/desk#${projectAnchorId(target.slug)}`
    case 'piece':
      return `/art?${PIECE_PARAM}=${encodeURIComponent(target.slug)}`
    case 'external':
      return target.href
  }
}

/** Leaves the site, so it wants `target="_blank"` and a different affordance. */
export function isExternalTarget(target: PostTarget): boolean {
  return target.to === 'external'
}
