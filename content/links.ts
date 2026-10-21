/**
 * Socials, GitHub, résumé, contact. Surfaced at the top of the Coding and Art tabs.
 *
 * These were their own hotspots on the old site — a LinkedIn object, a GitHub
 * object, a résumé object scattered around the room. Condensing eight hotspots to
 * three (docs/DESIGN.md) turns them into content inside the panels instead.
 *
 * **Which links belong on which tab is decided here, not in a component.** They are
 * a statement about what each destination is for — the Coding tab points at the code
 * and the professional profile, the Art tab at where the animation gets posted — and
 * a component filtering a flat list by label would be a second place that judgement
 * lived.
 *
 * Adding one back is editing a list below and nothing else: `LinkRow` reads the
 * glyph and the displayed address off the `href`, and it already draws an envelope
 * for a `mailto:` and a sheet for a PDF.
 */

import type { Link } from './types'

export const SOCIAL_LINKS: readonly Link[] = [
  { label: 'GitHub', href: 'https://github.com/henryyjiang' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/henryyjiang/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@atrxiy' },
]

/**
 * NOT SURFACED. Both were in the Coding row, and the email in the Art row too, until
 * Henry took them out on 2026-10-21 — the lists above are the two tabs' rows now.
 * They stay written down because they are still true: the file is in `public/` and
 * the address is his. Putting either back in a list below is the whole change.
 *
 * Keep `resume.pdf`'s filename stable regardless — it may be linked externally.
 */
export const RESUME: Link = { label: 'Résumé', href: '/resume.pdf' }

export const EMAIL = 'henryyjiang42@gmail.com'

export const EMAIL_LINK: Link = { label: 'Email', href: `mailto:${EMAIL}` }

const BY_LABEL = new Map(SOCIAL_LINKS.map((link) => [link.label, link]))

/** The Coding tab's row: where the code is, and who it belongs to. */
export const CODING_LINKS: readonly Link[] = [BY_LABEL.get('GitHub')!, BY_LABEL.get('LinkedIn')!]

/** The Art tab's row: where the drawing and animation work is posted. */
export const ART_LINKS: readonly Link[] = [BY_LABEL.get('TikTok')!]
