import { CARD_ALT, DESCRIPTION, TITLE } from '@/content/site'

/**
 * The room with nothing open.
 *
 * There is no panel on this route — the scene lives in the root layout and is the
 * whole of what a sighted visitor sees here. What this renders is the other half of
 * that: the `main` landmark, and the only words on the page.
 *
 * **It used to render `null`, and that was a hole rather than a saving.** The scene
 * is a canvas inside an `aria-hidden` wrapper, so a screen reader arriving at the
 * site's front door found a nav and then nothing at all — no `main` to skip to and
 * not one word about whose site this is. Lighthouse flagged the missing landmark on
 * 2026-10-21 (`landmark-one-main`, the only accessibility audit the site failed, and
 * only on this route); the silence was the worse half and it flagged nothing.
 *
 * **Visually hidden, not visible.** The room is the design of this page and putting
 * a headline over it would be redesigning it, which is not this file's call. `sr-only`
 * keeps the text out of the layout while leaving it real DOM text in the accessibility
 * tree — the opposite of baking words into the canvas, which docs/DESIGN.md
 * § Accessibility forbids outright.
 *
 * The copy is `content/site.ts`, the same three strings the tab title and the link
 * preview use, because this is the same sentence being said to a different reader and
 * a second copy would drift. `CARD_ALT` describes the picture, which is exactly what
 * someone who cannot see the room is missing.
 */
export default function Home() {
  return (
    <main className="sr-only">
      <h1>{TITLE}</h1>
      <p>{DESCRIPTION}</p>
      <p>{CARD_ALT}</p>
    </main>
  )
}
