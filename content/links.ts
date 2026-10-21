/**
 * Socials, GitHub, résumé, contact. Surfaced at the top of the Coding and Art tabs.
 *
 * These were their own hotspots on the old site — a LinkedIn object, a GitHub
 * object, a résumé object scattered around the room. Condensing eight hotspots to
 * three (docs/DESIGN.md) turns them into content inside the panels instead.
 *
 * **Which links belong on which tab is decided here, not in a component.** They are
 * a statement about what each destination is for — the Coding tab points at code and
 * a résumé, the Art tab points at where the animation gets posted — and a component
 * filtering a flat list by label would be a second place that judgement lived.
 */

import type { Link } from './types'

export const SOCIAL_LINKS: readonly Link[] = [
  { label: 'GitHub', href: 'https://github.com/henryyjiang' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/henryyjiang/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@atrxiy' },
]

/** Carried over from the old site. Keep the filename stable — it may be linked externally. */
export const RESUME: Link = { label: 'Résumé', href: '/resume.pdf' }

export const EMAIL = 'henryyjiang42@gmail.com'

export const EMAIL_LINK: Link = { label: 'Email', href: `mailto:${EMAIL}` }

const BY_LABEL = new Map(SOCIAL_LINKS.map((link) => [link.label, link]))

/** The Coding tab's row: where the code is, who it belongs to, how to hire or reach him. */
export const CODING_LINKS: readonly Link[] = [
  BY_LABEL.get('GitHub')!,
  BY_LABEL.get('LinkedIn')!,
  RESUME,
  EMAIL_LINK,
]

/** The Art tab's row: where the drawing and animation work is posted. */
export const ART_LINKS: readonly Link[] = [BY_LABEL.get('TikTok')!, EMAIL_LINK]
