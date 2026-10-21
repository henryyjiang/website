import { LinkIcon, linkText } from '@/components/overlay/link-icons'
import type { Link } from '@/content/types'

/**
 * The outward links at the top of a tab: one per line, address and all.
 *
 * Which links appear is `content/links.ts`'s decision, not this component's — the
 * Coding tab points at code and a résumé, the Art tab at where the animation gets
 * posted. This only knows how a link looks when it is a control rather than prose.
 *
 * **A list, not a row of pills.** It was four small dimmed buttons side by side
 * until 2026-10-21, which is the shape a site uses for links it is obliged to carry
 * rather than ones it wants followed — and these are the ones it wants followed.
 * So each gets its own line, reading `mark · GITHUB: github.com/henryyjiang`: the
 * address is shown rather than hidden behind a word, which is both more to look at
 * and more to act on. Someone reading on a phone can see the handle without tapping,
 * and someone reading a printout can type it in.
 *
 * The label column has a floor so the addresses line up into one column of their
 * own. The whole line is the link — one target, which matters most on the device
 * where the pills were hardest to hit.
 *
 * A `mailto:` or an in-site file (`/resume.pdf`) is not a new tab; anything on
 * another origin is. Derived from the href rather than declared per link, because a
 * flag in the content would be a second thing to keep true. The glyph and the
 * address text are read off the href for the same reason — see `link-icons.tsx`.
 */
export function LinkRow({ links, label }: { links: readonly Link[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-col items-start gap-1">
      {links.map((link) => {
        const external = link.href.startsWith('http')

        return (
          <a
            key={link.href}
            href={link.href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="group u-pill flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 py-1"
          >
            <LinkIcon
              href={link.href}
              className="size-4 shrink-0 text-dim transition-colors duration-150 group-hover:text-active"
            />
            <span className="u-label text-dim sm:min-w-28">{link.label}:</span>
            <span className="min-w-0 text-sm break-all text-active underline decoration-dim/50 underline-offset-4 transition-colors duration-150 group-hover:decoration-active">
              {linkText(link.href)}
            </span>
          </a>
        )
      })}
    </nav>
  )
}
