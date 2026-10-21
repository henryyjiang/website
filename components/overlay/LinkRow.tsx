import type { Link } from '@/content/types'

/**
 * The row of outward links at the top of a tab.
 *
 * Which links appear is `content/links.ts`'s decision, not this component's — the
 * Coding tab points at code and a résumé, the Art tab at where the animation gets
 * posted. This only knows how a link looks when it is a control rather than prose.
 *
 * A `mailto:` or an in-site file (`/resume.pdf`) is not a new tab; anything on
 * another origin is. Derived from the href rather than declared per link, because a
 * flag in the content would be a second thing to keep true.
 */
export function LinkRow({ links, label }: { links: readonly Link[]; label: string }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-2">
      {links.map((link) => {
        const external = link.href.startsWith('http')

        return (
          <a
            key={link.href}
            href={link.href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="u-pill u-notch u-label border border-dim/40 px-4 py-2 hover:border-active/60"
          >
            {link.label}
          </a>
        )
      })}
    </nav>
  )
}
