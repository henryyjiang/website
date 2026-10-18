/**
 * Socials, GitHub, résumé, contact. Surfaced in the desk panel.
 *
 * These were their own hotspots on the old site — a LinkedIn object, a GitHub
 * object, a résumé object scattered around the room. Condensing eight hotspots to
 * three (docs/DESIGN.md) turns them into content inside the desk panel instead.
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
