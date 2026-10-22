/**
 * About-me copy for the desk panel.
 *
 * Structured fields rather than one blob, so the panel can lay it out. The old site
 * had this as <br>-separated lines mixing a short bio with favourites; the content is
 * worth keeping — it gives the page personality a project list can't — but it should
 * be a deliberate section rather than a run of line breaks.
 *
 * NOTE: the old site also published a personal phone number next to the email. It is
 * deliberately not carried over — a public page is a bad place for it and nobody
 * asked for it to be there. Add it back if you actually want it public.
 */

/**
 * What the about section calls him.
 *
 * First name only, which is the register the rest of the tab is written in — the
 * site says who it belongs to in the page title and the Coding tab's links, and
 * this is the part that is a person rather than a portfolio.
 */
export const NAME = 'Henry'

/**
 * Henry's AniList username — the whole of that integration's configuration.
 *
 * It lives here rather than in the environment because it is public and is a fact
 * about Henry, which is what this file is for. There is no second half: AniList's
 * API reads a public list **unauthenticated**, so there is no credential, no
 * `.env.local` entry and nothing to set in Vercel. (It was written against
 * MyAnimeList first, which did want a registered application; Henry uses AniList.)
 *
 * **`null` turns the feature off**, which is the state of a fresh clone and has to
 * keep rendering. Fill it in and the watchlist rows appear; the list must be public
 * on AniList, or the API answers 404 and they stay away. Either way the News tab
 * holds the space open under its `Watchlist` heading, so switching the rows on is
 * not a layout change (`app/updates/page.tsx` § `WatchlistPending`). See
 * `lib/anilist.ts` and `docs/CONTENT.md` § The watchlist.
 */
export const ANILIST_USERNAME: string | null = null

/**
 * The portrait beside the about section, as a slug rather than a path.
 *
 * It is the photograph from the old site's about block (`assets/me.jpeg`), and it
 * comes in through `art/about/` like every other picture — named after this slug,
 * optimised by `npm run art`, resolved by `lib/content-images.ts`. One image in its
 * own collection rather than a file dropped in `public/`, because a path typed into
 * a component is the second source of truth this project keeps out of `content/`.
 */
export const PORTRAIT = { slug: 'me', alt: NAME } as const

/**
 * NOT SURFACED. Both lines were at the top of the about section until 2026-10-21,
 * when Henry took them out — the first for being a list of what he likes that the
 * three tabs underneath already demonstrate, the second with it.
 *
 * What is left is a photograph and a list of favourites, and that is the section:
 * it shows rather than states. Kept here because the copy is his and an about page
 * that wants a sentence again should start from what he actually wrote.
 */
export const BIO = [
  'I like coding, art, and animation, and I work on AI and 2D/3D animation projects in my free time.',
  'I hope to get better each and every day to create incredible works.',
] as const

/**
 * The favourites list. Kept as pairs so the panel can render it as a definition
 * list rather than guessing at structure.
 *
 * **Every row here is a favourite, and the panel says so** — the section is headed
 * `Favourites` rather than leaving a reader to infer it from `Show: Blue Lock`.
 * That heading is also the rule for what belongs: a row that is a *status* rather
 * than a favourite does not.
 *
 * Which is why `Currently watching` and `Last completed` are not here. They were
 * stale on the old site and stale here, because the only thing that kept them true
 * was Henry remembering to edit a file after finishing an episode. They are fetched
 * now instead — `lib/anilist.ts`, under their own heading in the panel, because
 * a status is not a favourite.
 */
export const FAVOURITES: readonly { label: string; value: string }[] = [
  { label: 'Show', value: 'Blue Lock' },
  { label: 'Book', value: 'Tokyo Ghoul' },
  { label: 'Song', value: 'Shelter — Porter Robinson' },
  { label: 'Music artist', value: 'Ado' },
  { label: 'Game', value: 'Nier: Automata' },
]

/**
 * Carried over from the old site's skills grid.
 *
 * NOT SURFACED. The Coding tab showed these as a row of chips above the project list
 * until 2026-10-21, when Henry cut them: a list of languages is a claim the
 * projects underneath already make, and it was the first thing a reader met. Kept
 * here rather than deleted because it is real content and a résumé-ish surface may
 * want it later; delete it if that never happens.
 */
export const SKILLS: readonly string[] = [
  'Java',
  'Python',
  'C/C++/C#',
  'HTML/JS/CSS',
  'TensorFlow/PyTorch',
  'Postgres',
  'AWS',
  'Docker',
  'React',
  'TypeScript',
  'Pandas',
  'Node.js',
  'JUnit',
  'JIRA',
]
