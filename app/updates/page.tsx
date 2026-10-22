import Link from 'next/link'

import { OverlayPanel } from '@/components/overlay/OverlayPanel'
import { SectionRule } from '@/components/overlay/SectionRule'
import { FAVOURITES, NAME, PORTRAIT } from '@/content/about'
import { POSTS } from '@/content/posts'
import { byDateDesc, type Post, type PostTarget } from '@/content/types'
import { imageFor, imageForPost } from '@/lib/content-images'
import { fetchWatchlist, type Watchlist } from '@/lib/anilist'
import { isExternalTarget, postHref } from '@/lib/post-target'

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
 * than leaving a reader to work out what `Anime: Blue Lock` is asserting, and the
 * portrait is the width the feed's thumbnails are (`--post-shot`), so the tab has
 * one picture size rather than three.
 *
 * **Under it, what he is actually watching**, fetched from AniList rather than
 * typed (`lib/anilist.ts`). It is a second block with its own heading because a
 * status is not a favourite — the thing that made those two rows wrong for years
 * was filing them next to things that do not change. The block is absent entirely
 * when the fetch has nothing, which is also a fresh clone's state.
 *
 * **The posts are news links, not articles.** A thumbnail, a date and a headline —
 * no prose at all, which is the whole difference between this tab and the Coding
 * one. Anything that wants a paragraph is a project or a piece, and the post points
 * at it.
 *
 * **The thumbnail is `--post-shot`, a fifth of the screen**, where a Coding
 * screenshot is `--shot` and gets a third (app/globals.css). The row is exactly as
 * tall as its picture, so that one number is the feed's height as well, and the two
 * tabs hold their proportion to each other at every window width rather than only
 * at the one they were judged at. Henry set the ratio on 2026-10-21, after a fixed
 * 96px square turned out to read as a table of contents rather than as a feed.
 *
 * **The headline carries the row.** A 288px picture beside 16px type read as a
 * caption next to a photograph rather than as an entry, so the title is display
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

            <Readout rows={FAVOURITES} />

            {watchlist ? (
              <>
                <SectionRule>Watchlist</SectionRule>
                <Readout rows={watchlistRows(watchlist)} />
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="feed-heading" className="mt-10 flex flex-col gap-4">
        <SectionRule id="feed-heading">Feed</SectionRule>

        <ol className="flex flex-col gap-2">
          {posts.map((post) => (
            <li key={post.slug}>
              <PostRow post={post} />
            </li>
          ))}
        </ol>
      </section>
    </OverlayPanel>
  )
}

/**
 * A column of label-and-value rows: the favourites, and the watchlist under them.
 *
 * One component for both so the two blocks cannot drift apart — they sit directly
 * above and below each other, where a two-pixel disagreement in the label column
 * would be the only thing a reader noticed about either.
 */
function Readout({ rows }: { rows: readonly { label: string; value: string }[] }) {
  return (
    <dl className="grid">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline gap-3 border-b border-dim/15 py-1.5">
          <dt className="u-telemetry w-32 shrink-0 text-muted">{row.label}</dt>
          <dd className="min-w-0 text-sm">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * The fetched list, as the same label-and-value rows everything else here uses.
 *
 * Each row is dropped when it has nothing to say rather than rendered empty: "he is
 * between shows" and "the API did not answer" look identical in an empty row, and
 * only one of them is worth a line. A score of 0 is AniList for "not rated", so
 * it is a missing rating rather than a bad one and the slash-ten is left off.
 */
function watchlistRows(watchlist: Watchlist): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []

  if (watchlist.watching.length > 0) {
    rows.push({ label: 'Watching', value: watchlist.watching.join(', ') })
  }

  const last = watchlist.lastCompleted
  if (last) {
    rows.push({
      label: 'Last completed',
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
  // same 16px is right and anything more eats the headline's width.
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
