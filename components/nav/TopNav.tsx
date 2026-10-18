'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import { DESTINATIONS, destinationFor } from '@/content/nav'

/**
 * The site's navigation: a menu button naming where you are, over a list of
 * everywhere you can go.
 *
 * This is the DOM half of the duplication the scene requires. A Pixi sprite is not
 * in the accessibility tree, cannot be tabbed to and is not a link, so the room's
 * objects have always needed a real counterpart; until now that counterpart was
 * screen-reader-only, which served assistive technology and nobody else. It is
 * visible now because reaching a destination should not depend on finding the
 * object that leads there — on a phone, where the scene is framed rather than
 * explorable, it is the only way in (docs/ARCHITECTURE.md § Hotspots).
 *
 * A disclosure rather than a row of tabs: four links across the top of a painted
 * room would compete with it at every width, and the room is the thing worth
 * looking at.
 *
 * Deliberately undesigned, like the overlay chrome it borrows from — Phase 4 owns
 * how this looks. The behaviour is not waiting on that: the button says what it
 * controls, Escape closes it, a click outside closes it, and focus comes back to
 * the button so a keyboard user is never dropped at the top of the document.
 */
export function TopNav() {
  const pathname = usePathname()
  const current = destinationFor(pathname)

  const [open, setOpen] = useState(false)
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Marked handled, or the panel underneath would read the same Escape as
      // "close the panel" and the reader would lose their place for pressing one
      // key once.
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && rootRef.current?.contains(target)) return
      setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed top-0 right-0 left-0 z-50 flex justify-center p-3"
    >
      <div ref={rootRef} className="pointer-events-auto relative">
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          className="flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-sm backdrop-blur-sm"
        >
          <span>{current.label}</span>
          <span aria-hidden="true" className="text-xs opacity-60">
            {open ? '▲' : '▼'}
          </span>
        </button>

        {/* Rendered only when open, so its links are out of the tab order while it
            is closed — a menu you cannot see should not be a menu you can tab into. */}
        {open && (
          <ul
            id={menuId}
            className="absolute top-full left-1/2 mt-2 flex w-44 -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-white/15 bg-black/80 py-1 backdrop-blur-sm"
          >
            {DESTINATIONS.map((destination) => (
              <li key={destination.href}>
                <Link
                  href={destination.href}
                  aria-current={destination.href === pathname ? 'page' : undefined}
                  // Closed here rather than by watching the route, because choosing
                  // a destination is the event — a menu the reader has already acted
                  // on should not need dismissing, and the same click closes it
                  // whether it came from a pointer or from Enter on the link.
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2 text-sm hover:bg-white/10 aria-[current=page]:opacity-60"
                >
                  {destination.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  )
}
