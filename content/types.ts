/**
 * Content shapes.
 *
 * All copy and data lives in this folder as typed modules; components read it and
 * never contain it. The old site hardcoded every project into index.html as ~15
 * lines of nested markup each, which made sorting, filtering and reuse impossible —
 * and reuse is now mandatory, because the billboard carousel and /updates are two
 * views of one source.
 *
 * No entry here carries an image path. Words live in `content/`, pixels live in
 * `art/`, and `slug` joins the two: an image is dropped into the inbox folder for
 * its collection, named after the slug, and `npm run art` optimises it and lists it
 * in `public/images/manifest.json`. `lib/content-images.ts` resolves it back.
 *
 * See docs/CONTENT.md.
 */

export type Link = {
  label: string
  href: string
}

export type Project = {
  /** Stable. Joins this entry to `art/projects/<slug>.png`. */
  slug: string
  title: string
  /** ISO date. Required: the list is timestamped and sorts on this, never on array position. */
  date: string
  blurb: string
  detail?: string
  /**
   * NOT SURFACED. The Coding rows showed these as `#ml #quant` under each entry
   * until 2026-10-21, when Henry cut them. Kept because they are the only
   * machine-readable thing about a project's subject, and a filter would want them.
   */
  tags: string[]
  links: Link[]
}

export type ArtPiece = {
  /** Stable. Joins this entry to `art/pieces/<slug>.png`. */
  slug: string
  title: string
  /**
   * NOT DISPLAYED, and still required. The Art tab showed this in the grid and
   * beside the popup's title until 2026-10-21; it orders the grid now and nothing
   * else. Newest first, so an entry with the wrong date lands in the wrong place
   * and there is no longer anything on screen to show you that it did.
   */
  date: string
  medium?: string
  /**
   * NOT DISPLAYED. The popup showed this under the media until 2026-10-21, when the
   * caption bar went (docs/DESIGN.md § Art). It is the image's alt text now, so it
   * still earns its keep — write it for someone who cannot see the piece.
   */
  caption?: string
}

/**
 * What clicking a post goes to.
 *
 * The blog points *inward*, and that is the whole reason it is worth having rather
 * than being a duplicate of the other two tabs: a post is a notice that something
 * happened, and the thing that happened is nearly always already on the site. So a
 * post names it, by the same slug the thing is filed under — `project` scrolls the
 * Coding list to that row, `piece` opens that drawing in the Art popup.
 *
 * `external` is the escape hatch for something that genuinely lives elsewhere, and a
 * post with no target at all reads as plain text.
 *
 * A slug here is checked against the collection it names by `npm run art`, like
 * every other slug join in this folder. A mistyped one would link to an anchor that
 * does not exist, which a reader experiences as the site being broken rather than as
 * a missing picture.
 */
export type PostTarget =
  | { to: 'project'; slug: string }
  | { to: 'piece'; slug: string }
  | { to: 'external'; href: string }

export type Post = {
  /**
   * Stable, and a join key rather than a route segment.
   *
   * It no longer joins to an image: a post has no picture of its own and borrows the
   * one belonging to whatever `target` names (`lib/content-images.ts`). What the
   * slug still has to be is unique and stable, because it is this entry's identity
   * everywhere a post is listed.
   */
  slug: string
  date: string
  /**
   * A headline, not a sentence. This is constrained by the billboard: it has to read
   * as large, brief text at a distance. Prose belongs in `body`.
   */
  title: string
  /**
   * NOT SURFACED. One line, and it was the third line of a feed row until
   * 2026-10-21, when the row's headline grew to display type and this became the
   * small print under a poster. Kept because it is written, it is good, and it is
   * the only prose a post has if the feed ever wants a denser shape again.
   *
   * The billboard never showed it — that surface is a headline at a distance.
   */
  body?: string
  target?: PostTarget
}

/** Newest first. Shared by every surface that lists dated content. */
export function byDateDesc<T extends { date: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}
