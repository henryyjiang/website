'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { DESTINATIONS } from '@/content/nav'

/**
 * Shared chrome for the three tab panels.
 *
 * **The frame is settled; the interiors are not.** docs/DESIGN.md § Chrome decides
 * how a panel is bounded, lit and titled — dark ground, a hairline rule, a cut
 * corner, display type, a telemetry marker. How a project list, an art portfolio or
 * a blog post reads *inside* that frame is Phase 7 and still deliberately open. Do
 * not let anything in a route's page harden into that decision by default.
 *
 * **Nearly full-screen, and the nav sits on top of it.** A blog post is an image
 * and a body of text at once, which a centred column three quarters of the way up
 * the viewport cannot hold without one of them being cramped. So the panel takes the
 * whole screen bar a hairline margin, and `TopNav` is drawn over its top edge rather
 * than floating above it with a gap — the tabs read as attached to the panel, which
 * is what they are. The header's top padding is what keeps the title out from under
 * them; it is the one measurement here that has to agree with the nav's height, and
 * it is set to clear the tabs by a hair rather than to float the title in the middle
 * of the frame — 64/80px left 40-odd pixels of nothing above every headline. One
 * value at both sizes, because the viewport's own margin is what differs (8px
 * against 12px) and the nav is 4px taller once its label is, so a single number
 * lands the same distance under the tabs either way.
 *
 * **44px is the floor.** It clears the tabs by 7px, and the next step down puts the
 * telemetry line inside the notch cut out of a tab's bottom corner — which does not
 * read as a tight layout, it reads as a rendering fault.
 *
 * The *behaviour* is deliberately that of a page rather than of a dialog. Each panel
 * is a real route with its own URL, so there is no focus trap and no `aria-modal`:
 * tabbing past the end of the panel reaches the rest of the document, exactly as it
 * would on any page. What a visual overlay does owe the reader is that focus follows
 * the content when the route changes, and that the obvious key closes it.
 */
export function OverlayPanel({ children }: { children?: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  // The heading is the nav's label for this route, read from content/nav.ts rather
  // than passed in. They are the same destination, so a page that typed its own
  // title could disagree with the tab that leads to it — and did: the tab said
  // "Coding" while the panel said "Desk". One list, one name.
  const title = DESTINATIONS.find((destination) => destination.href === pathname)?.label ?? ''

  // A client-side route change moves no focus on its own, so a keyboard or screen
  // reader user would still be back at the top of a document whose content has been
  // replaced. Focus the heading instead: it announces the panel and puts the next
  // Tab inside it. `preventScroll` because the panel is already in view, and
  // scrolling the fixed layout would only shift the scene behind it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [pathname])

  // Escape closes, which is what a panel over a scene looks like it should do. It
  // routes rather than hides, so the URL, the scene's overlay state and the back
  // button cannot disagree about whether a panel is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      router.push('/')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  return (
    <main className="pointer-events-none fixed inset-0 z-10 p-2 sm:p-3">
      <section
        aria-labelledby="overlay-title"
        className="u-notch u-scanlines pointer-events-auto relative flex h-full w-full flex-col overflow-hidden border border-dim/30 bg-panel/92 backdrop-blur-md"
      >
        <header className="flex shrink-0 items-end justify-between gap-4 border-b border-dim/25 px-5 pt-11 pb-3 sm:px-8">
          <div className="min-w-0">
            {/* The reference labels its live row with a part number. It is decoration,
                but technical decoration: it implies a machine with more going on than
                it is showing. aria-hidden because it says nothing to a reader. */}
            <p aria-hidden="true" className="u-telemetry mb-1 text-dim">
              ◢ sec.{title.slice(0, 3).toLowerCase()} · 0x
              {title.length.toString(16).padStart(2, '0')}
            </p>
            <h1
              id="overlay-title"
              ref={headingRef}
              tabIndex={-1}
              className="truncate text-3xl font-semibold tracking-[0.08em] text-active uppercase outline-none sm:text-4xl"
            >
              {title}
            </h1>
          </div>

          <Link
            href="/"
            className="u-label u-notch shrink-0 border border-dim/40 px-4 py-2 text-muted transition-colors duration-150 hover:border-alert/60 hover:text-alert"
          >
            Close
          </Link>
        </header>

        <div className="u-panel-body min-h-0 flex-1 overflow-auto px-5 py-6 sm:px-8">{children}</div>
      </section>
    </main>
  )
}
