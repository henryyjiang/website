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
 * **A row is an image and a text box beside it** (docs/DESIGN.md § Panel interiors).
 * The image column is `--shot` wide and the image keeps its own height, because the
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
 * the top of it. Both are gone — about moved to the Blog panel on 2026-10-21 and
 * skills were cut the same day, along with each project's tag row. A list of
 * languages and a row of `#ml #quant` under every entry are both claims the work
 * itself already makes, and they were crowding the thing a reader came for. The data
 * stays in `content/`; nothing surfaces it.
 */
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
              <article
                className={`grid items-start gap-4 sm:gap-6 ${
                  image ? 'sm:grid-cols-[var(--shot)_minmax(0,1fr)]' : ''
                }`}
              >
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
                   * `--shot` (app/globals.css). One number means a square screenshot —
                   * two of the eight are square — fills the column exactly, while a
                   * portrait one, the phone capture is 684x1490, is bounded by that
                   * same square instead of making its row three times the height of
                   * the text beside it. Nothing is cropped either way; a tall image
                   * simply sits narrower than the column.
                   *
                   * Below `sm` the row stacks and there is no column, so the width
                   * half of that number has nothing to do and `--shot` would only be
                   * imposing a laptop's fraction of the screen on a phone — where it
                   * is smaller than the ceiling this always had. So the plain 22rem
                   * stays underneath, and a phone's images are the size they were.
                   */
                  <picture className="u-notch flex justify-center overflow-hidden border border-dim/25 bg-ground/60">
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

                <div className="u-notch flex flex-col gap-3 border border-dim/25 bg-ground/40 p-4 sm:p-5">
                  <p className="u-telemetry flex flex-wrap items-center gap-x-3 text-dim">
                    <span aria-hidden="true">
                      ◢ prj.{String(projects.length - index).padStart(2, '0')}
                    </span>
                    <time dateTime={project.date}>{formatDate(project.date)}</time>
                  </p>

                  <h2 className="text-xl text-active sm:text-2xl">{project.title}</h2>

                  <p className="text-sm leading-relaxed sm:text-base">{project.blurb}</p>
                  {project.detail ? (
                    <p className="text-sm leading-relaxed opacity-70">{project.detail}</p>
                  ) : null}

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
