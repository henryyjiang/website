/**
 * The site's destinations, in the order they are offered.
 *
 * One list, used by the nav and by nothing else that needs to be kept in step with
 * it by hand. The room's objects lead to three of these four; the nav exists so
 * that reaching them never depends on finding the object, on having a pointer, or
 * on the scene rendering at all (docs/ARCHITECTURE.md § Hotspots).
 *
 * The labels are the destinations' names, not the objects' — "Coding", not "Desk".
 * An object is how you get somewhere in the room; this is the list of somewheres.
 * The routes keep their original names so that links already shared keep working,
 * which is also why a label can be reworded here without anything else moving.
 *
 * **This is the only place a destination is named.** `OverlayPanel` reads its
 * heading back out of this list by pathname rather than taking a title prop, so the
 * tab and the panel it opens cannot disagree — they did once, which is why it works
 * this way. Renaming a destination is editing one string here. `/updates` went from
 * "Blog" to "News" on 2026-10-21 and nothing else moved.
 */

export type Destination = {
  href: string
  label: string
}

export const DESTINATIONS: readonly Destination[] = [
  { href: '/', label: 'Home' },
  { href: '/updates', label: 'News' },
  { href: '/desk', label: 'Coding' },
  { href: '/art', label: 'Art' },
]
