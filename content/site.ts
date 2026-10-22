/**
 * What the site calls itself.
 *
 * One line of copy that reaches five places — the browser tab, the Open Graph card,
 * the Twitter card, the site name a scraper prints under a link, and the `sr-only`
 * heading on the home route, which is the only thing a screen reader finds there
 * because the room itself is a canvas. Five copies of a name is five chances for one
 * to be edited alone and quietly disagree with the rest. It is content, so it lives
 * here rather than in the layout that renders it. (This comment said four until
 * 2026-10-21; the accessibility pass added the fifth.)
 *
 * **"Henry's Blog" since 2026-10-21**, Henry's call, replacing "Henry Jiang". Note
 * that the nav's own tab for `/updates` went the other way the same day — it is
 * labelled News, because the entries there are notices rather than articles
 * (`content/nav.ts`). The site's name and that tab's name are different things and
 * are allowed to disagree.
 *
 * `DESCRIPTION` is the only sentence most people will read before deciding whether
 * to click: it is what a link to this site looks like pasted into a chat. Keep it to
 * one line and keep it concrete.
 */

export const TITLE = "Henry's Blog"

export const DESCRIPTION = 'Software, AI research, and drawing.'

/**
 * Alt text for the social card, which is also what a screen reader announces for
 * the link preview. Describes the picture, not the site.
 */
export const CARD_ALT =
  'A desk and a window in a dark apartment, looking out over a neon city at night.'
