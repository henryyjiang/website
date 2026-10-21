'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { GlitchBurst } from '@/components/theme/glitch'
import type { ArtPiece } from '@/content/types'
import type { ContentImage } from '@/lib/content-images'
import { PIECE_PARAM } from '@/lib/post-target'

/** A piece with its media already resolved, because `imageFor` reads a build-time manifest. */
export type GalleryPiece = ArtPiece & { media: ContentImage | null }

/**
 * The drawing portfolio: a 3-wide grid, and a popup over the whole page.
 *
 * **The popup is a URL state**, `?piece=<slug>`, which is what lets the blog link
 * straight to a piece and what makes the back button close it. It is driven through
 * the History API rather than the router: `router.push` of a search param is a
 * navigation, and a navigation to show something already on the page is a round trip
 * the reader waits through for no reason. The grid cells stay real `<a href>`s, so
 * middle-click, copy-link and a keyboard all behave.
 *
 * **The URL is the only state.** `window.history.pushState` is wired into the
 * App Router, so `useSearchParams` re-renders on it and the back button arrives as
 * an ordinary param change — no mirror in `useState` that could disagree with the
 * address bar, and nothing to reconcile when the two are changed from different
 * places. The component is inside a Suspense boundary, which is what makes its first
 * client render already carry the real params rather than an empty set.
 *
 * **Opening fires the glitch**, the same burst a route change fires, from the same
 * code. docs/DESIGN.md § Panel interiors explains why that is consistent with
 * "glitch is only for route changes" rather than an exception to it.
 */
export function ArtGallery({ pieces }: { pieces: readonly GalleryPiece[] }) {
  const slug = useSearchParams().get(PIECE_PARAM)
  const opener = useRef<HTMLElement | null>(null)

  const open = useCallback((next: string) => {
    opener.current = document.activeElement as HTMLElement | null
    window.history.pushState(null, '', `/art?${PIECE_PARAM}=${encodeURIComponent(next)}`)
  }, [])

  const close = useCallback(() => {
    window.history.pushState(null, '', '/art')
    // Put the reader back where they were. Without this, closing drops focus on
    // <body> and the next Tab starts from the top of the document — which for a grid
    // of twenty pieces means finding your place again every time.
    opener.current?.focus({ preventScroll: true })
    opener.current = null
  }, [])

  const piece = slug ? (pieces.find((item) => item.slug === slug) ?? null) : null

  return (
    <>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {pieces.map((item) => (
          <li key={item.slug}>
            <GridCell piece={item} onOpen={open} />
          </li>
        ))}
      </ul>

      <Escape>
        {piece ? <PieceDialog piece={piece} onClose={close} /> : null}
        <GlitchBurst trigger={slug ?? 'closed'} />
      </Escape>
    </>
  )
}

/**
 * Out of the panel and onto the body.
 *
 * The popup has to cover the whole page, nav included, and it cannot do that from
 * where it is rendered: the panel's frame carries `backdrop-blur`, and a
 * backdrop-filter makes an element both a stacking context *and* the containing
 * block for `position: fixed` descendants. So a dialog inside it is clipped to the
 * panel's hairline margin and pinned under the nav's z-index no matter how high its
 * own is — which is exactly what it did, and looks like a z-index that is merely too
 * low. The glitch goes with it for the same reason; a burst that stopped at the
 * panel's edge would read as the panel flickering rather than the display dropping.
 *
 * The mount check is `useSyncExternalStore` rather than an effect because the server
 * has no `document`: it returns false while rendering on the server and during
 * hydration, then true, so the markup both sides compare is identical and nothing
 * calls `setState` from an effect to get there.
 */
function Escape({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  return mounted ? createPortal(children, document.body) : null
}

/**
 * One thumbnail.
 *
 * 16:9 and cropped to fill — the one place on the site where an image is cropped,
 * and it is cropping the *thumbnail* rather than the piece. A grid of mixed aspects
 * cannot be scanned, which is the only thing a grid is for.
 *
 * **Shaped like a video index, because half of these are videos.** Wide cells, four
 * across on a desktop, a generous row gap and the text stacked under the image
 * rather than squeezed onto one line with it. Square cells at three across made each
 * piece the size of a poster, which is the popup's job; the grid's job is to be
 * scanned.
 */
function GridCell({
  piece,
  onOpen,
}: {
  piece: GalleryPiece
  onOpen: (slug: string) => void
}) {
  const media = piece.media

  return (
    <a
      href={`/art?${PIECE_PARAM}=${encodeURIComponent(piece.slug)}`}
      onClick={(event) => {
        // Let the browser have the clicks that mean "somewhere else": a new tab, a
        // new window, a download. Only the plain left click is ours.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onOpen(piece.slug)
      }}
      className="group u-pill block"
      aria-label={`${piece.title}${media?.video ? ', video' : ''}`}
    >
      <span className="u-notch relative block aspect-video overflow-hidden border border-dim/25 bg-ground/60 transition-colors duration-150 group-hover:border-active/60">
        {media ? (
          <picture>
            <source srcSet={media.src} type="image/webp" />
            <img
              src={media.fallback}
              alt=""
              width={media.width}
              height={media.height}
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          </picture>
        ) : (
          <span className="u-telemetry grid size-full place-items-center text-dim">
            No image
          </span>
        )}

        {media?.video ? (
          /* A video and a drawing look identical as thumbnails, so the one that
             plays says so before it is clicked rather than after. */
          <span
            aria-hidden="true"
            className="u-notch absolute bottom-2 left-2 border border-primary/50 bg-ground/80 px-2 py-1 text-[0.625rem] leading-none tracking-[0.14em] text-primary uppercase"
          >
            ▶ Video
          </span>
        ) : null}
      </span>

      <span className="mt-3 block">
        <span className="block truncate text-sm font-semibold text-text transition-colors duration-150 group-hover:text-active">
          {piece.title}
        </span>
        <span className="u-telemetry mt-1 block truncate text-dim">
          {piece.medium ? `${piece.medium} · ` : ''}
          {formatDate(piece.date)}
        </span>
      </span>
    </a>
  )
}

/**
 * The piece, over the whole page.
 *
 * A real modal, unlike the panels: it covers the nav as well, so `aria-modal` and a
 * focus trap are honest here where on a panel they would be a lie (the panels are
 * routes, and tabbing out of one into the rest of the document is correct).
 *
 * Escape is caught in the **capture** phase and marked handled, because the panel
 * underneath also listens for Escape and would otherwise route to `/` — both
 * listeners are on `window`, where capture runs before bubble regardless of which
 * was added first. Closing a popup should close the popup.
 *
 * **Everything that is not the piece is in the header.** Date beside the title,
 * medium on the telemetry line, and no footer: a caption bar under the media was a
 * band of prose where a reader is looking at a drawing, and the only thing it told
 * them that the header does not was a sentence the piece already says. The space it
 * cost goes back to the media, which is what the popup exists to show. The caption
 * is still written in `content/art.ts` — it is the image's alt text now, which is
 * the one reader it was always worth most to.
 */
function PieceDialog({ piece, onClose }: { piece: GalleryPiece; onClose: () => void }) {
  const frame = useRef<HTMLDivElement | null>(null)
  const media = piece.media

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !frame.current) return

      const focusable = frame.current.querySelectorAll<HTMLElement>(
        'a[href], button, video[controls], [tabindex]:not([tabindex="-1"])',
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      // Wrap at both ends. The dialog covers everything, so there is nowhere outside
      // it for focus to usefully go until it is closed.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  useEffect(() => {
    frame.current?.focus({ preventScroll: true })
  }, [piece.slug])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ground/85 p-2 backdrop-blur-sm sm:p-6"
      // The backdrop closes, the frame does not. Checking the target rather than
      // stopping propagation inside, so a click that starts on the image and drags
      // out does not count as a click on the backdrop.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={frame}
        role="dialog"
        aria-modal="true"
        aria-label={piece.title}
        tabIndex={-1}
        className="u-notch u-scanlines relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden border border-dim/30 bg-panel/95 outline-none"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-dim/25 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p aria-hidden="true" className="u-telemetry text-dim">
              ◢ art.{piece.slug.slice(0, 3)} · {media?.video ? 'motion' : 'still'}
              {piece.medium ? ` · ${piece.medium}` : ''}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="min-w-0 truncate text-xl tracking-[0.04em] text-active uppercase sm:text-2xl">
                {piece.title}
              </h2>
              <time dateTime={piece.date} className="u-telemetry shrink-0 text-dim">
                {formatDate(piece.date)}
              </time>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="u-pill u-notch u-label shrink-0 border border-dim/40 px-4 py-2 hover:border-alert/60 hover:text-alert"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-5">
          {media?.video ? (
            /* Muted, because nothing on this site makes a sound unasked
               (docs/DESIGN.md § Accessibility). Controls are there to unmute. */
            <video
              key={piece.slug}
              controls
              autoPlay
              loop
              muted
              playsInline
              poster={media.fallback}
              width={media.video.width}
              height={media.video.height}
              className="mx-auto max-h-[78vh] w-auto max-w-full"
            >
              <source src={media.video.src} type={media.video.type} />
            </video>
          ) : media ? (
            <picture>
              <source srcSet={media.src} type="image/webp" />
              <img
                src={media.fallback}
                alt={piece.caption ?? piece.title}
                width={media.width}
                height={media.height}
                className="mx-auto max-h-[78vh] w-auto max-w-full"
              />
            </picture>
          ) : (
            <p className="py-12 text-center text-sm text-dim">
              Nothing has been dropped into <code>art/pieces/</code> for this one yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
