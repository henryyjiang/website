import { LinkRow } from '@/components/overlay/LinkRow'
import { OverlayPanel } from '@/components/overlay/OverlayPanel'
import { ScrollToAnchor } from '@/components/overlay/ScrollToAnchor'
import { CODING_LINKS } from '@/content/links'
import { PROJECTS } from '@/content/projects'
import { byDateDesc } from '@/content/types'
import { imageFor } from '@/lib/content-images'
import { projectAnchorId } from '@/lib/post-target'

/**
 * Software and AI research: the project list, newest first.
 *
 * **A row is one box with the image floated inside it** (docs/DESIGN.md § Panel
 * interiors). The image is `--shot` wide and keeps its own height, because the
 * import deliberately does not crop — `art/projects/` holds square screenshots and
 * 16:9 ones and both are the shape they were exported at. Forcing a ratio here would
 * crop a screenshot whose content runs to its edges, which is most of them.
 *
 * **Every row is an anchor.** The blog links into this list by slug, so the id has to
 * be derivable from the content rather than typed — `projectAnchorId` is the one
 * place that shape is written, and `npm run art` checks that every post pointing at a
 * project names one that exists.
 *
 * The about-me section used to be at the bottom of this tab and the skills grid at
 * the top of it. Both are gone — about moved to the News panel on 2026-10-21 and
 * skills were cut the same day, along with each project's tag row. A list of
 * languages and a row of `#ml #quant` under every entry are both claims the work
 * itself already makes, and they were crowding the thing a reader came for. The data
 * stays in `content/`; nothing surfaces it.
 */
/** Body copy in a row's text box. Every paragraph of it, at one weight. */
const PARAGRAPH = 'text-sm leading-relaxed sm:text-base'

export default function DeskPage() {
  const projects = byDateDesc(PROJECTS)

  return (
    <OverlayPanel>
      <ScrollToAnchor />

      <LinkRow links={CODING_LINKS} label="Elsewhere" />

      <ol className="mt-8 flex flex-col gap-6">
        {projects.map((project, index) => {
          const image = imageFor('projects', project.slug)

          return (
            <li
              key={project.slug}
              id={projectAnchorId(project.slug)}
              // Focusable so that arriving from the blog can put the reader *on* the
              // row rather than merely scrolling it into view. -1 keeps it out of the
              // tab order, where a dozen stops on non-controls would be noise.
              tabIndex={-1}
              className="scroll-mt-1 pl-3 outline-none"
            >
              {/*
               * **One box per row, with the image floated inside it**, so that the
               * prose wraps beside the image and then runs the full width of the row
               * once it is past the bottom of it.
               *
               * This was two boxes in a two-column grid until 2026-10-21. A grid item
               * is a rectangle, and the text column therefore stayed narrow for its
               * whole height no matter how far past the image it ran — a long entry
               * was a tall thin column of text beside a large empty space. Nothing in
               * grid or flex fixes that: both lay out rectangles, and text running
               * beside an image and then under it is an L-shape. A float is the one
               * thing in CSS that does it, and a float only affects line boxes, so
               * the text cannot be a box of its own any more — hence one border
               * around the pair rather than one around each.
               *
               * `flow-root` is load-bearing: it makes this box contain the float, so
               * the border wraps the image on a row whose image is taller than its
               * text. Without it the image hangs out of the bottom of its own row.
               *
               * **`max-w` is on the row, and it has to be.** The measure needs
               * capping — the panel is nearly full-screen, so prose running the full
               * width of a row reached ~264 characters a line at 1920px against the
               * 45–75 that reads comfortably. The obvious place for that cap is the
               * paragraph, and it is the wrong one: a `max-width` on a paragraph is
               * measured from the container's left content edge, which is *behind*
               * the float, so it shortens the lines running beside the image and
               * leaves the lines below it exactly as long. Capping the row caps
               * both. 56rem is the dial — lower it for shorter lines.
               */}
              <article className="u-notch flow-root border border-dim/25 bg-ground/40 p-4 sm:max-w-[56rem] sm:p-5">
                {image ? (
                  /*
                   * <picture> rather than a bare <img> because the manifest carries a
                   * pair: a browser with no WebP support takes the fallback, and every
                   * other browser never requests it. Width and height come from the
                   * measured image, so the row reserves its space before the image
                   * decodes — which also keeps the scroll-to-anchor above from landing
                   * at an offset that is about to move.
                   *
                   * Width-led with a ceiling on the height, and from `sm` up both are
                   * `--shot` (app/globals.css). The width is set here rather than by a
                   * grid column now, because a float shrink-wraps its contents and
                   * would otherwise be as wide as whatever image it happens to hold.
                   * One number means a square screenshot fills it exactly, while a
                   * portrait one, the phone capture is 684x1490, is bounded by that
                   * same square and centred in it. Nothing is cropped either way.
                   *
                   * `min(var(--shot), 38%)` because the row is now capped and
                   * `--shot` is a fraction of the *viewport*: past the cap the
                   * viewport keeps growing and the row does not, so the unclamped
                   * value would eventually be wider than the row holding it. The
                   * percentage is of the row, so the image stays in proportion to the
                   * text beside it at every width. At the cap the two agree almost
                   * exactly, which is why this is not visible as a change in size.
                   *
                   * Below `sm` there is no float and the row stacks, so the width half
                   * of that number has nothing to do and `--shot` would only be
                   * imposing a laptop's fraction of the screen on a phone — where it
                   * is smaller than the ceiling this always had. So the plain 22rem
                   * stays underneath, and a phone's images are the size they were.
                   */
                  <picture className="u-notch mb-4 flex justify-center overflow-hidden border border-dim/25 bg-ground/60 sm:float-left sm:mr-6 sm:mb-3 sm:w-[min(var(--shot),38%)]">
                    <source srcSet={image.src} type="image/webp" />
                    <img
                      src={image.fallback}
                      alt=""
                      width={image.width}
                      height={image.height}
                      loading="lazy"
                      decoding="async"
                      className="block h-auto max-h-[22rem] w-auto max-w-full sm:max-h-[var(--shot)]"
                    />
                  </picture>
                ) : null}

                {/*
                 * A plain block, deliberately: `space-y-3` spaces the children with
                 * margins, where the `flex flex-col gap-3` this replaced would have
                 * made this a flex container, and a flex container ignores floats
                 * entirely — the image would have sat *under* the text rather than
                 * beside it. Nothing here may establish a block formatting context
                 * for the same reason.
                 */}
                <div className="space-y-3">
                  <p className="u-telemetry flex flex-wrap items-center gap-x-3 text-dim">
                    <span aria-hidden="true">
                      ◢ prj.{String(projects.length - index).padStart(2, '0')}
                    </span>
                    <time dateTime={project.date}>{formatDate(project.date)}</time>
                  </p>

                  <h2 className="text-xl text-active sm:text-2xl">{project.title}</h2>

                  {/*
                   * `blurb` and `detail` are consecutive paragraphs of one piece of
                   * prose, so they render identically — same size, same opacity, the
                   * gap between them the only thing marking the break.
                   *
                   * `detail` was a dimmer, smaller second tier until 2026-10-21, when
                   * the first entry to actually use it got a two-paragraph write-up
                   * and the second half read as fine print under the first. One
                   * class, named once, is why they cannot drift apart again.
                   */}
                  <p className={PARAGRAPH}>{project.blurb}</p>
                  {project.detail ? <p className={PARAGRAPH}>{project.detail}</p> : null}

                  {project.links.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {project.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="u-pill u-notch u-label border border-dim/40 px-3 py-1.5 hover:border-active/60"
                        >
                          {link.label} ↗
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            </li>
          )
        })}
      </ol>
    </OverlayPanel>
  )
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
