'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DESTINATIONS } from '@/content/nav'

/**
 * The site's navigation: every destination, in one small floating pill.
 *
 * This is the DOM half of the duplication the scene requires. A Pixi sprite is not
 * in the accessibility tree, cannot be tabbed to and is not a link, so the room's
 * objects have always needed a real counterpart; until recently that counterpart
 * was screen-reader-only, which served assistive technology and nobody else. It is
 * visible because reaching a destination should not depend on finding the object
 * that leads there — and on a phone, where a quarter of the room is on screen at a
 * time, the object may simply not be in view (docs/ARCHITECTURE.md § Hotspots).
 *
 * All four at once rather than behind a menu button: four short words cost one tap
 * instead of two and still fit a 375px screen, and a pill that floats over the art
 * reads as part of the scene in a way a bar across the top would not. It is why
 * this does not span the window, sit flush to the edge, or carry a background of
 * its own beyond the pill.
 *
 * Deliberately undesigned past that, like the overlay chrome it borrows from —
 * Phase 4 owns how this looks.
 */
export function TopNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed top-0 right-0 left-0 z-50 flex justify-center p-3"
    >
      <ul className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 backdrop-blur-sm">
        {DESTINATIONS.map((destination) => {
          const current = destination.href === pathname

          return (
            <li key={destination.href}>
              <Link
                href={destination.href}
                aria-current={current ? 'page' : undefined}
                className={`block rounded-full px-3 py-1.5 text-sm ${
                  current ? 'bg-white/15' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {destination.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
