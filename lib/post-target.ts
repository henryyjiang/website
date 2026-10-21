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
 * Those are the only two couplings between panels on the site. Keeping them in one
 * named function rather than interpolated at three call sites is what makes them
 * findable from either end — and `npm run art` checks that every slug on this side
 * exists on the other.
 */

import type { PostTarget } from '@/content/types'

/** The id a Coding row carries, so a post can scroll to it. */
export function projectAnchorId(slug: string): string {
  return `project-${slug}`
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
