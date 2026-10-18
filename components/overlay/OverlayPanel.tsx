import Link from 'next/link'

/**
 * Shared chrome for the three tab panels.
 *
 * Deliberately undesigned. The direction for the interiors is "less retro, more
 * flowy and energetic" and nothing more specific has been settled, so this is a
 * neutral container that holds a title, a close affordance and whatever the route
 * puts inside it. Panel design is Phase 4 — see docs/ROADMAP.md. Do not let this
 * styling harden into a decision by default.
 */
export function OverlayPanel({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <main className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center p-6">
      <section
        aria-labelledby="overlay-title"
        className="pointer-events-auto flex h-full max-h-[min(80vh,720px)] w-full max-w-3xl flex-col gap-4 overflow-auto rounded-lg border border-white/15 bg-black/70 p-8 backdrop-blur-sm"
      >
        <header className="flex items-baseline justify-between gap-4">
          <h1 id="overlay-title" className="text-2xl font-medium">
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
