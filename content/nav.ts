/**
 * The site's destinations, in the order they are offered.
 *
 * One list, used by the nav and by nothing else that needs to be kept in step with
 * it by hand. The room's objects lead to three of these four; the nav exists so
 * that reaching them never depends on finding the object, on having a pointer, or
 * on the scene rendering at all (docs/ARCHITECTURE.md § Hotspots).
 *
 * The labels are the destinations' names, not the objects' — "Software", not
 * "Desk". An object is how you get somewhere in the room; this is the list of
 * somewheres. The routes keep their original names so that links already shared
 * keep working.
 */

export type Destination = {
  href: string
  label: string
}

export const DESTINATIONS: readonly Destination[] = [
  { href: '/', label: 'Home' },
  { href: '/updates', label: 'News' },
  { href: '/desk', label: 'Software' },
  { href: '/art', label: 'Art' },
]

/** The destination a path belongs to, for labelling the nav's trigger. */
export function destinationFor(pathname: string): Destination {
  return DESTINATIONS.find((d) => d.href === pathname) ?? DESTINATIONS[0]!
}
