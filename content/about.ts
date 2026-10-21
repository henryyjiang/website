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

export const BIO = [
  'I like coding, art, and animation, and I work on AI and 2D/3D animation projects in my free time.',
  'I hope to get better each and every day to create incredible works.',
] as const

/**
 * The favourites list. Kept as pairs so the panel can render it as a definition
 * list rather than guessing at structure.
 *
 * `Currently watching` and `Last completed` go stale — they were stale on the old
 * site. Either keep them current or drop them.
 */
export const FAVOURITES: readonly { label: string; value: string }[] = [
  { label: 'Anime', value: 'Blue Lock' },
  { label: 'Manga', value: 'Tokyo Ghoul' },
  { label: 'Currently watching', value: 'Witch Hat Atelier, Re:Zero, Dorohedoro' },
  { label: 'Last completed', value: 'Fire Force — 6.9/10' },
  { label: 'Song', value: 'Shelter — Porter Robinson' },
  { label: 'Music artist', value: 'Ado' },
  { label: 'Games', value: 'Nier: Automata, Overwatch, Limbus Company' },
]

/**
 * Carried over from the old site's skills grid.
 *
 * NOT SURFACED. The Coding tab showed these as a row of chips above the project list
 * until 2026-10-21, when Henry cut them: a list of languages is a claim the eight
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
