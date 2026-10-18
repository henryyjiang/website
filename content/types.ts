/**
 * Content shapes.
 *
 * All copy and data lives in this folder as typed modules; components read it and
 * never contain it. The old site hardcoded every project into index.html as ~15
 * lines of nested markup each, which made sorting, filtering and reuse impossible —
 * and reuse is now mandatory, because the billboard carousel and /updates are two
 * views of one source.
 *
 * See docs/CONTENT.md.
 */

export type Link = {
  label: string
  href: string
}

export type Project = {
  slug: string
  title: string
  /** ISO date. Required: the list is timestamped and sorts on this, never on array position. */
  date: string
  blurb: string
  detail?: string
  tags: string[]
  links: Link[]
  /** Path under public/. */
  image?: string
}

export type ArtPiece = {
  slug: string
  title: string
  date: string
  medium?: string
  image: string
  caption?: string
}

export type Update = {
  date: string
  /**
   * A headline, not a sentence. This is constrained by the billboard: it has to read
   * as large, brief text at a distance. Prose belongs in `body`.
   */
  title: string
  body?: string
  href?: string
}

/** Newest first. Shared by every surface that lists dated content. */
export function byDateDesc<T extends { date: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}
