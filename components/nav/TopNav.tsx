'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { DESTINATIONS } from '@/content/nav'

/**
 * The site's navigation: every destination, as tabs across the top.
 *
 * This is the DOM half of the duplication the scene requires. A Pixi sprite is not
 * in the accessibility tree, cannot be tabbed to and is not a link, so the room's
 * objects have always needed a real counterpart; until recently that counterpart
 * was screen-reader-only, which served assistive technology and nobody else. It is
 * visible because reaching a destination should not depend on finding the object
 * that leads there — and on a phone, where a quarter of the room is on screen at a
 * time, the object may simply not be in view (docs/ARCHITECTURE.md § Hotspots).
 *
 * **Tabs, not a floating pill.** They butt against each other with no gap and sit
 * flush to the top of the viewport, so when a panel is open they read as attached to
 * it rather than hovering above it. The panel is nearly full-screen and starts
 * underneath them; these are drawn over its top edge, which is why this is `z-50`
 * and the panel is `z-10`.
 *
 * **The styling inverts the usual nav.** Idle items are dimmed to the edge of
 * legibility and the current one takes all the contrast plus a container nothing
 * else has, which is how the reference's menu works and why a list of items reads as
 * one live item and three dormant ones. See docs/DESIGN.md § Chrome.
 */
export function TopNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed top-0 right-0 left-0 z-50 flex justify-center"
    >
      <ul className="pointer-events-auto flex items-stretch">
        {DESTINATIONS.map((destination, index) => {
          const current = destination.href === pathname

          return (
            <li key={destination.href} className={index > 0 ? '-ml-px' : undefined}>
              <Link
                href={destination.href}
                aria-current={current ? 'page' : undefined}
                className={`relative block border px-5 py-3 text-sm font-semibold tracking-[0.16em] uppercase backdrop-blur-sm transition-colors duration-150 sm:px-7 sm:text-base ${
                  current
                    ? 'z-10 border-active/70 bg-panel/95 text-active'
                    : 'border-dim/30 bg-panel/80 text-dim hover:text-text'
                }`}
                style={{
                  // The cut is on the bottom corners only: these hang off the top
                  // edge of the screen, so a notched top corner would cut into
                  // nothing and read as a rendering mistake.
                  clipPath:
                    'polygon(0 0, 100% 0, 100% calc(100% - var(--notch)), calc(100% - var(--notch)) 100%, var(--notch) 100%, 0 calc(100% - var(--notch)))',
                }}
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
