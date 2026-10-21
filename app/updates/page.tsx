import Link from 'next/link'

import { OverlayPanel } from '@/components/overlay/OverlayPanel'
import { SectionRule } from '@/components/overlay/SectionRule'
import { BIO, FAVOURITES } from '@/content/about'
import { POSTS } from '@/content/posts'
import { byDateDesc, type Post, type PostTarget } from '@/content/types'
import { imageForPost } from '@/lib/content-images'
import { isExternalTarget, postHref } from '@/lib/post-target'

/**
 * The blog: a short introduction, then the feed.
 *
 * **About sits here**, moved off the Coding tab on 2026-10-21 and kept brief. It is
 * the one part of the site that is about Henry rather than about work, and a blog is
 * where a reader expects to meet the person (docs/DESIGN.md § Panel interiors).
 *
 * **The posts are news links, not articles.** A thumbnail, a date, a headline, one
 * line — dense enough to take in at a glance, which is the whole difference between
 * this tab and the Coding one. Anything that wants a paragraph is a project or a
 * piece, and the post points at it.
 *
 * **The thumbnail is `--post-shot`, a fifth of the screen**, where a Coding
 * screenshot is `--shot` and gets a third (app/globals.css). The row is exactly as
 * tall as its picture, so that one number is the feed's height as well, and the two
 * tabs hold their proportion to each other at every window width rather than only
 * at the one they were judged at. Henry set the ratio on 2026-10-21, after a fixed
 * 96px square turned out to read as a table of contents rather than as a feed.
 *
 * Condensed still means condensed: the body is one truncated line at any row
 * height. The picture is what grew, because a post is a notice about something
 * shown at full size one tab over — give it a paragraph and this becomes the
 * article list the tab exists not to be.
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
export default function UpdatesPage() {
  const posts = byDateDesc(POSTS)

  return (
    <OverlayPanel>
      <section aria-labelledby="about-heading" className="flex flex-col gap-4">
        <SectionRule id="about-heading">About</SectionRule>

        <div className="flex flex-col gap-2">
          {BIO.map((line) => (
            <p key={line} className="max-w-prose leading-relaxed sm:text-lg">
              {line}
            </p>
          ))}
        </div>

        <dl className="grid gap-x-8 sm:grid-cols-2">
          {FAVOURITES.map((item) => (
            <div
              key={item.label}
              className="flex items-baseline gap-3 border-b border-dim/15 py-1.5"
            >
              <dt className="u-telemetry w-32 shrink-0 text-dim">{item.label}</dt>
              <dd className="min-w-0 text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
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

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="u-telemetry flex items-center gap-2 text-dim">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {target ? <span aria-hidden="true">· {targetLabel(target)}</span> : null}
        </span>
        <span className="text-base font-semibold text-active sm:text-lg">{post.title}</span>
        {post.body ? (
          <span className="truncate text-sm text-text/75">{post.body}</span>
        ) : null}
      </span>

      <span aria-hidden="true" className="u-telemetry shrink-0 self-center text-dim">
        {target ? (isExternalTarget(target) ? '↗' : '→') : ''}
      </span>
    </>
  )

  const shell =
    'u-notch flex w-full items-center gap-4 border border-dim/25 bg-ground/40 p-4 transition-colors duration-150'

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
