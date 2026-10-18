import Link from 'next/link'

import { HOTSPOTS } from './hotspots'

/**
 * The hotspots as real DOM controls.
 *
 * A Pixi sprite is invisible to the accessibility tree, cannot be tabbed to and is
 * not a link. So every hotspot exists twice: hover and clicking are handled in Pixi
 * with alpha-accurate hit testing against the object art (Phase 2), and this nav is
 * how the site is navigated without the scene at all.
 *
 * Visually hidden rather than `display: none` — it must stay focusable. Focusing a
 * link reveals it, so a keyboard user can see where they are.
 *
 * See docs/ARCHITECTURE.md § Hotspots: why they are built twice.
 */
export function SceneNav() {
  return (
    <nav aria-label="Rooms" className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:z-50 focus-within:rounded focus-within:bg-black/80 focus-within:p-3">
      <ul className="flex flex-col gap-2">
        {HOTSPOTS.map((hotspot) => (
          <li key={hotspot.id}>
            <Link href={hotspot.href} className="underline">
              {hotspot.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
