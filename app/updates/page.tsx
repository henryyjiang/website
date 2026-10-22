import Link from 'next/link'

import { OverlayPanel } from '@/components/overlay/OverlayPanel'
import { ScrollToAnchor } from '@/components/overlay/ScrollToAnchor'
import { SectionRule } from '@/components/overlay/SectionRule'
import { FAVOURITES, NAME, PORTRAIT } from '@/content/about'
import { POSTS } from '@/content/posts'
import { byDateDesc, type Post, type PostTarget } from '@/content/types'
import { imageFor, imageForPost } from '@/lib/content-images'
import { fetchWatchlist, type Watchlist } from '@/lib/anilist'
import { isExternalTarget, postAnchorId, postHref } from '@/lib/post-target'

/**
 * Regenerated hourly, which is how often the watchlist is re-read (`lib/anilist.ts`).
 *
 * It lives here rather than on the fetch because Next's Data Cache only keys GET
 * requests: a `next: { revalidate }` on that module's GraphQL POST is accepted and
 * then quietly ignored, and the page would bake once at build and never move again.
 * A literal, because segment config has to be statically analysable.
 *
 * The rest of the tab is content modules and does not need this — the cost of
 * regenerating a page that reads two arrays is nil, and the alternative is a
 * watchlist that is only ever as current as the last deploy.
 */
export const revalidate = 3600

/**
 * The blog: a short introduction, then the feed.
 *
 * **About sits here**, moved off the Coding tab on 2026-10-21 and kept brief. It is
 * the one part of the site that is about Henry rather than about work, and a blog is
 * where a reader expects to meet the person (docs/DESIGN.md § Panel interiors).
 *
 * It is a portrait, a name and a list of favourites, and no prose at all — the bio
 * went on 2026-10-21 (`content/about.ts` § BIO). The list is *headed* Favourites rather
 * than leaving a reader to work out what `Show: Blue Lock` is asserting, and the
 * portrait is the width the feed's thumbnails are (`--post-shot`), so the tab has
 * one picture size rather than three.
 *
 * **Under it, what he is actually watching**, fetched from AniList rather than
 * typed (`lib/anilist.ts`). It is a second block with its own heading because a
 * status is not a favourite — the thing that made those two rows wrong for years
 * was filing them next to things that do not change.
 *
 * **Its space is held open when the fetch has nothing** (`WatchlistPending`), which
 * is a fresh clone's state and was briefly everyone's, while AniList had their API
 * switched off. Henry asked for the gap rather than the clean absence the block used
 * to have, so that the section the rows would land in was already on the page and
 * turning them on was not a layout change — which is what happened on 2026-10-22,
 * when the API came back and the username went in.
 *
 * **The posts are news links, not articles.** A thumbnail, a date and a headline —
 * no prose at all, which is the whole difference between this tab and the Coding
 * one. Anything that wants a paragraph is a project or a piece, and the post points
 * at it.
 *
 * **The thumbnail is `--post-shot`, a sixth of the screen**, where a Coding
 * screenshot is `--shot` and gets a third (app/globals.css). The row is exactly as
 * tall as its picture, so that one number is the feed's height as well, and the two
 * tabs hold their proportion to each other at every window width rather than only
 * at the one they were judged at. Henry set the ratio on 2026-10-21, after a fixed
 * 96px square turned out to read as a table of contents rather than as a feed.
 *
 * **The headline carries the row.** A 288px picture beside 16px type read as a
 * caption next to a photograph rather than as an entry — that was the thumbnail at
 * 1440 while it was a fifth of the screen, and it is 230px now — so the title is display
 * type that scales with the breakpoints and the date is the large readout. The one
 * line of body went at the same time (2026-10-21): with the headline at this size
 * it was the small print under a poster, and a feed of five posts does not need a
 * summary of a headline. `Post.body` is still written — see `content/types.ts`.
 *
 * **And they point inward.** `target` names the Coding entry or the Art piece the
 * post is about; `lib/post-target.ts` turns that into the URL the other panel
 * implements, which is also the only coupling between two panels on the site. A post
 * with no target is plain text rather than a dead link.
 *
 * **And they are linked *into*, by the billboard.** Every row carries `post-<slug>`
 * so that clicking the carousel lands on the post it was showing rather than at the
 * top of the tab, which is a long way above it (2026-10-22, `docs/DESIGN.md` § The
 * destinations). `ScrollToAnchor` does the arrival, the same as on the Coding tab.
 *
 * **A post has no picture of its own**: its thumbnail is the picture belonging to
 * whatever it points at, resolved by `imageForPost`. One image per thing, shown
 * here, in its own panel, and on the billboard.
 *
 * Reads the same `content/posts.ts` the billboard carousel does — one source, two
 * surfaces (docs/CONTENT.md) — so this page is also the accessible copy of what the
 * billboard shows, since canvas text is not in the accessibility tree.
 */
export default async function UpdatesPage() {
  const posts = byDateDesc(POSTS)
  const watchlist = await fetchWatchlist()

  return (
    <OverlayPanel>
      <ScrollToAnchor />

      <section aria-labelledby="about-heading" className="flex flex-col gap-4">
        <SectionRule id="about-heading">About</SectionRule>

        <div className="grid gap-5 sm:grid-cols-[var(--post-shot)_minmax(0,1fr)] sm:gap-8">
          <Portrait />

          <div className="flex flex-col gap-4">
            {/* Set like a feed headline rather than as a heading element: the
                section already has one ("About") and the list below has another,
                and a third in between would be structure that says nothing. */}
            <p className="text-2xl leading-tight font-semibold tracking-[0.03em] text-active uppercase sm:text-4xl">
              {NAME}
            </p>

            <SectionRule>Favourites</SectionRule>

            <Readout rows={FAVOURITES} columns={2} />

            <SectionRule>Watchlist</SectionRule>

            {watchlist ? <Readout rows={watchlistRows(watchlist)} /> : <WatchlistPending />}
          </div>
        </div>
      </section>

      <section aria-labelledby="feed-heading" className="mt-10 flex flex-col gap-4">
        <SectionRule id="feed-heading">Feed</SectionRule>

        <ol className="flex flex-col gap-2">
          {posts.map((post) => (
            <li
              key={post.slug}
              // Every row is an anchor, the same way every Coding row is — the
              // billboard links in here by slug (`lib/post-target.ts`).
              id={postAnchorId(post.slug)}
              // Focusable so arriving from the billboard puts the reader *on* the
              // post rather than merely scrolling it into view. -1 keeps it out of
              // the tab order, where a stop on a row that is already a link would
              // mean pressing Tab twice to get past each entry.
              tabIndex={-1}
              // The arrival marker is an inset bar on the left (app/globals.css),
              // so the row needs somewhere to put it. Padding reserves the space and
              // the matching negative margin gives it back, which keeps the boxes
              // flush with the About section above rather than stepping right by
              // 12px for a marker that is only visible for two seconds.
              className="-ml-3 scroll-mt-1 pl-3 outline-none"
            >
              <PostRow post={post} />
            </li>
          ))}
        </ol>
      </section>
    </OverlayPanel>
  )
}

/**
 * Label-and-value rows: the favourites, and the watchlist under them.
 *
 * One component for both so the two blocks cannot drift apart — they sit directly
 * above and below each other, where a two-pixel disagreement in the label column
 * would be the only thing a reader noticed about either. Which is why the label
 * column is one width in both layouts rather than narrowing when it has half the
 * room: the favourites' left-hand column and the watchlist's rows line up.
 *
 * **A value may be several lines rather than one string**, which is what the
 * watching row is. Three titles joined with commas was how it read until 2026-10-22,
 * when live data arrived and showed why that could not hold: real anime titles carry
 * their own punctuation — `Made in Abyss: Mezameru Shinpi`, `JoJo's Bizarre
 * Adventure 2nd - 3rd STAGE` — so the commas separating them are no louder than the
 * commas and colons inside them, and at phone width the row wrapped to five lines of
 * what read as a sentence. One title per line is the same information with the
 * boundaries drawn by the layout instead of by punctuation.
 *
 * **`columns={2}` pairs the rows up**, which is how the favourites are set — five of
 * them down a column was a lot of height for five short facts (Henry, 2026-10-21).
 * It pairs them only from `lg`, because narrower than that the value gets about a
 * hundred pixels beside a 128px label and `Shelter — Porter Robinson` wraps; the
 * saving is vertical space on a wide window, and there is none to save on a phone.
 * An odd last row sits alone in the left-hand column, with the rule under it half
 * the width — the end of a list, rather than a cell that failed to render.
 */
function Readout({
  rows,
  columns = 1,
}: {
  rows: readonly ReadoutRow[]
  columns?: 1 | 2
}) {
  return (
    <dl className={`grid ${columns === 2 ? 'lg:grid-cols-2 lg:gap-x-8' : ''}`}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline gap-3 border-b border-dim/15 py-1.5">
          <dt className="u-telemetry w-32 shrink-0 text-muted">{row.label}</dt>
          <dd className="min-w-0 text-sm">
            {typeof row.value === 'string' ? (
              row.value
            ) : (
              /* `items-baseline` on the row above aligns the label with the first
                 line, which is where a reader looks for it — so a row that grows
                 downwards still reads as one entry rather than drifting away from
                 its own label. */
              <span className="flex flex-col gap-0.5">
                {row.value.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** One row. A list value stacks; a string is the single line it has always been. */
type ReadoutRow = { label: string; value: string | readonly string[] }

/**
 * The watchlist's space, held open while there is no watchlist.
 *
 * Two rows the height the real ones are, labelled, with a dash where the value goes.
 * It is not a failure notice: AniList refusing the API, as they did for a day over
 * 2026-10-21, and Henry being between shows look identical from here, and neither is
 * worth an apology on a portfolio — the dash says "nothing yet" and the row says
 * where it will appear. The rows are live as of 2026-10-22, so this is the fallback
 * rather than the usual state, and it is still the one a fresh clone renders.
 *
 * `aria-hidden`, because an empty row is a fact about the layout rather than about
 * Henry and there is nothing in it to read out. The heading above it stays in the
 * tree: it labels a section of the page that exists.
 *
 * The labels come from `WATCHLIST_LABELS` rather than being typed again here, so the
 * placeholder cannot end up naming a row differently from the thing that replaces it.
 */
function WatchlistPending() {
  return (
    <div aria-hidden="true" className="grid">
      {Object.values(WATCHLIST_LABELS).map((label) => (
        <div key={label} className="flex items-baseline gap-3 border-b border-dim/15 py-1.5">
          <span className="u-telemetry w-32 shrink-0 text-dim">{label}</span>
          <span className="text-sm text-dim">&mdash;</span>
        </div>
      ))}
    </div>
  )
}

/**
 * What the two watchlist rows are called, in the order they render.
 *
 * One table for the rows and for the space held open in their absence
 * (`WatchlistPending`) — two lists of the same two labels is how the placeholder
 * quietly stops matching what it stands in for.
 */
const WATCHLIST_LABELS = {
  watching: 'Watching',
  lastCompleted: 'Last completed',
} as const

/**
 * The fetched list, as the same label-and-value rows everything else here uses.
 *
 * Each row is dropped when it has nothing to say rather than rendered empty: "he is
 * between shows" and "the API did not answer" look identical in an empty row, and
 * only one of them is worth a line. A score of 0 is AniList for "not rated", so
 * it is a missing rating rather than a bad one and the slash-ten is left off.
 *
 * The watching titles are handed over as the list they are, and `Readout` stacks
 * them. Joining them into one string here is what made them unreadable.
 */
function watchlistRows(watchlist: Watchlist): ReadoutRow[] {
  const rows: ReadoutRow[] = []

  if (watchlist.watching.length > 0) {
    rows.push({ label: WATCHLIST_LABELS.watching, value: watchlist.watching })
  }

  const last = watchlist.lastCompleted
  if (last) {
    rows.push({
      label: WATCHLIST_LABELS.lastCompleted,
      value: last.score > 0 ? `${last.title} — ${last.score}/10` : last.title,
    })
  }

  return rows
}

/**
 * Henry, from the old site's about block.
 *
 * Resolved by slug out of the import manifest like every other picture on the site,
 * so this component names no path and the file can be replaced by dropping a new
 * one into `art/about/`. It renders nothing at all if there is none — the about
 * section reads perfectly well without it, and an empty frame apologising for a
 * missing photograph does not.
 *
 * **It is as tall as the section beside it**, rather than a square of its own. The
 * column is `--post-shot` wide and the height comes from the grid: the name and the
 * favourites decide the row, and this stretches to it. Which is why the `img` is
 * absolutely positioned — in flow, its own height would be part of what sizes the
 * row it is supposed to be measuring itself against, and the two would settle at
 * whichever the browser resolved first. Out of flow it contributes nothing, the
 * right-hand column sets the height alone, and `object-cover` crops the square
 * photograph to whatever shape that leaves.
 */
function Portrait() {
  const image = imageFor('about', PORTRAIT.slug)
  if (!image) return null

  return (
    <picture className="u-notch relative block h-32 w-32 overflow-hidden border border-dim/25 sm:h-auto sm:w-[var(--post-shot)]">
      <source srcSet={image.src} type="image/webp" />
      <img
        src={image.fallback}
        alt={PORTRAIT.alt}
        width={image.width}
        height={image.height}
        className="absolute inset-0 size-full object-cover"
      />
    </picture>
  )
}

/**
 * One entry in the feed, as the whole box rather than as a link inside a box.
 *
 * Three shapes of the same row — an internal link, an external one, and a post that
 * points nowhere — because a box that looks clickable and is not is worse than one
 * that plainly is not. The content decides which: a `target`, and whether it leaves
 * the site.
 */
function PostRow({ post }: { post: Post }) {
  const image = imageForPost(post)
  const target = post.target

  const body = (
    <>
      {image ? (
        <picture className="u-notch block size-20 shrink-0 overflow-hidden border border-dim/25 sm:size-[var(--post-shot)]">
          <source srcSet={image.src} type="image/webp" />
          <img
            src={image.fallback}
            alt=""
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        </picture>
      ) : (
        /* No image is an ordinary state, not a gap to apologise for — the billboard
           shows these as a headline on the unlit surface and the feed keeps the
           same column so the rows still line up. */
        <span
          aria-hidden="true"
          className="u-notch grid size-20 shrink-0 place-items-center border border-dim/20 bg-ground/40 sm:size-[var(--post-shot)]"
        >
          <span className="u-telemetry text-dim">◢</span>
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-2 sm:gap-3">
        {/* The readout face spelled out rather than `u-telemetry`, because this is
            the one place it has to change size with the breakpoint — and that class
            is written outside Tailwind's layers, where it beats every utility that
            could override it. `font-mono` is the theme's face either way. */}
        <span className="flex items-center gap-2 font-mono text-[0.625rem] tracking-[0.08em] text-muted uppercase sm:text-sm sm:tracking-[0.1em]">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {target ? <span aria-hidden="true">· {targetLabel(target)}</span> : null}
        </span>
        <span className="text-xl leading-tight font-semibold tracking-[0.03em] text-active uppercase sm:text-3xl lg:text-4xl xl:text-5xl">
          {post.title}
        </span>
      </span>

      <span
        aria-hidden="true"
        className="shrink-0 self-center text-xl text-dim sm:text-3xl lg:text-4xl"
      >
        {target ? (isExternalTarget(target) ? '↗' : '→') : ''}
      </span>
    </>
  )

  // The gutter widens with the thumbnail. At 16px a 288px picture and a 48px
  // headline were touching, which made the row read as one block rather than as a
  // picture and the thing it is about; on a phone, where the picture is 80px, the
  // same 16px is right and anything more eats the headline's width. The picture is
  // 230px at 1440 since the feed came down to a sixth, so the wide gutters have
  // more room than they were set with rather than less — left alone on purpose.
  const shell =
    'u-notch flex w-full items-center gap-4 border border-dim/25 bg-ground/40 p-4 transition-colors duration-150 sm:gap-6 lg:gap-8'

  if (!target) {
    return <div className={shell}>{body}</div>
  }

  if (isExternalTarget(target)) {
    return (
      <a
        href={postHref(target)}
        target="_blank"
        rel="noreferrer"
        className={`u-pill ${shell} hover:border-active/50`}
      >
        {body}
      </a>
    )
  }

  // `scroll={false}` because landing on the right row is the Coding panel's own job
  // and it does it with more than a scroll — it focuses the row and marks it
  // (components/overlay/ScrollToAnchor.tsx). Letting the router also scroll would
  // just be a second opinion arriving a frame earlier.
  return (
    <Link href={postHref(target)} scroll={false} className={`u-pill ${shell} hover:border-active/50`}>
      {body}
    </Link>
  )
}

/** Where the click goes, in the reader's terms — the nav's word for it, or the host. */
function targetLabel(target: PostTarget): string {
  switch (target.to) {
    case 'project':
      return 'Coding'
    case 'piece':
      return 'Art'
    case 'external':
      return new URL(target.href).hostname.replace(/^www\./, '')
  }
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
