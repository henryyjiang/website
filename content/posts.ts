/**
 * The blog — one source, two surfaces.
 *
 * The billboard carousel in the scene reads the most recent few; /updates lists all
 * of them. The billboard must never hold its own copy, which is the whole reason
 * this file exists rather than the headlines being written into the scene.
 *
 * **The carousel only shows posts that have a picture**, which means posts with a
 * `target` that resolves to one. The billboard's screen is not painted into the city
 * any more, so there is no unlit surface for a headline to sit on; a post with
 * nothing to project is listed on /updates and skipped up there.
 *
 * `title` is constrained by the billboard: it has to read as large, brief text at a
 * distance, so keep it to a headline and put prose in `body`. `body` is constrained
 * by the panel, which is a condensed feed of news links rather than a page of
 * articles — one line each. Anything wanting a paragraph is a project in
 * `projects.ts` or a piece in `art.ts`, and the post points at it.
 *
 * **A post points inward.** `target` names the Coding entry or the Art piece the
 * post is about, by that thing's own slug, and the panel turns it into a link that
 * scrolls the Coding list to that row or opens that piece in the Art popup. That is
 * what makes the blog worth having next to the other two tabs instead of repeating
 * them. `npm run art` checks every one of those slugs.
 *
 * **Posts do not get their own URLs.** The News tab is one page holding a series of
 * posts, so `slug` is a join key and never a route segment. It still has to be
 * unique and stable, because it is this entry's identity everywhere a post is
 * listed — but it joins to nothing on disk. There is no `art/posts/`; a post borrows
 * the picture of whatever `target` names (`lib/content-images.ts`). This comment
 * claimed an inbox that has never existed and was corrected on 2026-10-21.
 * The route stays /updates so links already shared keep working; the nav labels it
 * News, renamed from "Blog" on 2026-10-21 because an entry here is a notice
 * pointing elsewhere rather than an article.
 *
 * **Titles and dates are Henry's; the bodies are placeholders.** The feed was seed
 * content describing the rebuild itself until 2026-10-21, when he replaced it with
 * what the posts are actually about. `body` is not rendered anywhere, so the
 * placeholder text costs nothing on screen — see `content/types.ts`.
 *
 * **Two of the four point at filler projects** (`cortex-rdm-paper`,
 * `gsoc-blender-contributions`). Those have no screenshot yet, so those two posts
 * have no picture, which means the feed renders them without one and the billboard
 * skips them. Dropping a screenshot into `art/projects/` is all it takes to put them
 * on the carousel.
 *
 * See docs/CONTENT.md.
 */

import type { Post } from './types'

export const POSTS: readonly Post[] = [
  {
    // Titles and dates below are Henry's, set 2026-10-21. The bodies are
    // placeholders — `body` is written but not rendered (`content/types.ts`), so
    // they cost nothing on screen and are there if the feed ever wants prose again.
    slug: 'custom-models-trained',
    date: '2026-10-21',
    title: 'Custom Models Finally Trained',
    body: 'The models behind the Cortex RDM paper are trained.',
    target: { to: 'project', slug: 'cortex-rdm-paper' },
  },
  {
    // The one link the News tab has that nothing else does: a post that opens a
    // piece in the Art popup rather than navigating to a page. Keep a post pointing
    // at a piece here.
    slug: 'wip-animation-sneak-peek',
    date: '2026-10-10',
    title: "A Sneak Peek on What I'm Working On...",
    body: 'Four shots of the animation in progress.',
    target: { to: 'piece', slug: 'current-wip-animation' },
  },
  {
    slug: 'gsoc-completion',
    date: '2026-08-13',
    title: 'Google Summer of Code Completion :D',
    body: 'Google Summer of Code, finished.',
    target: { to: 'project', slug: 'gsoc-blender-contributions' },
  },
  {
    slug: 'quantconnect-models',
    date: '2026-05-11',
    // "Model", singular, is correct: one of the two placed top 3.
    title: 'Top 3 Model on QuantConnect!',
    body: 'A quantum walk macro equity model and a fractal volatility options strategy, both published.',
    target: { to: 'project', slug: 'quantconnect-models' },
  },
]

/** What the billboard shows. Few enough to cycle through before anyone gets bored. */
export const BILLBOARD_COUNT = 3
