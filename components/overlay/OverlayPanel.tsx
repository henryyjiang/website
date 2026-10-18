'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * Shared chrome for the three tab panels.
 *
 * Deliberately undesigned. The direction for the interiors is "less retro, more
 * flowy and energetic" and nothing more specific has been settled, so this is a
 * neutral container that holds a title, a close affordance and whatever the route
 * puts inside it. Panel design is Phase 4 — see docs/ROADMAP.md. Do not let this
 * styling harden into a decision by default.
 *
 * The *behaviour* here is not waiting on that, and is deliberately the behaviour of
 * a page rather than of a dialog. Each panel is a real route with its own URL, so
 * there is no focus trap and no `aria-modal`: tabbing past the end of the panel
 * reaches the rest of the document, exactly as it would on any page. What a visual
 * overlay does owe the reader is that focus follows the content when the route
 * changes, and that the obvious key closes it.
 */
export function OverlayPanel({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  const router = useRouter()
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  // A client-side route change moves no focus on its own, so a keyboard or screen
  // reader user would still be back at the top of a document whose content has been
  // replaced. Focus the heading instead: it announces the panel and puts the next
  // Tab inside it. `preventScroll` because the panel is already in view, and
  // scrolling the fixed layout would only shift the scene behind it.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [title])

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
    <main className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center p-6">
      <section
        aria-labelledby="overlay-title"
        className="pointer-events-auto flex h-full max-h-[min(80vh,720px)] w-full max-w-3xl flex-col gap-4 overflow-auto rounded-lg border border-white/15 bg-black/70 p-8 backdrop-blur-sm"
      >
        <header className="flex items-baseline justify-between gap-4">
          <h1
            id="overlay-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-medium outline-none"
          >
            {title}
          </h1>
          <Link href="/" className="text-sm underline opacity-70 hover:opacity-100">
            Close
          </Link>
        </header>
        {children}
      </section>
    </main>
  )
}
