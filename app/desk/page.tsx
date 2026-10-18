import { OverlayPanel } from '@/components/overlay/OverlayPanel'
import { BIO, FAVOURITES, SKILLS } from '@/content/about'
import { EMAIL, RESUME, SOCIAL_LINKS } from '@/content/links'
import { PROJECTS } from '@/content/projects'
import { byDateDesc } from '@/content/types'

/**
 * Software and AI research: projects, socials, résumé, about.
 *
 * Contents are real; the *design* is Phase 4 and deliberately undecided, so this
 * renders the data plainly rather than inventing a look. See docs/ROADMAP.md.
 */
export default function DeskPage() {
  const projects = byDateDesc(PROJECTS)

  return (
    <OverlayPanel title="Desk">
      <nav aria-label="Elsewhere" className="flex flex-wrap gap-3 text-sm">
        {SOCIAL_LINKS.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="underline">
            {link.label}
          </a>
        ))}
        <a href={RESUME.href} target="_blank" rel="noreferrer" className="underline">
          {RESUME.label}
        </a>
        <a href={`mailto:${EMAIL}`} className="underline">
          Email
        </a>
      </nav>

      <section aria-labelledby="projects-heading" className="flex flex-col gap-5">
        <h2 id="projects-heading" className="text-lg font-medium opacity-80">
          Projects
        </h2>

        <ol className="flex flex-col gap-5">
          {projects.map((project) => (
            <li key={project.slug} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="font-medium">{project.title}</h3>
                <time dateTime={project.date} className="text-xs opacity-60">
                  {formatDate(project.date)}
                </time>
              </div>
              <p className="text-sm opacity-80">{project.blurb}</p>
              {project.detail ? (
                <p className="text-sm opacity-60">{project.detail}</p>
              ) : null}
              {project.links.length > 0 ? (
                <p className="flex gap-3 text-xs">
                  {project.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="underline opacity-80"
                    >
                      {link.label}
                    </a>
                  ))}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="about-heading" className="flex flex-col gap-3">
        <h2 id="about-heading" className="text-lg font-medium opacity-80">
          About
        </h2>
        {BIO.map((line) => (
          <p key={line} className="text-sm opacity-80">
            {line}
          </p>
        ))}

        <h3 className="mt-2 text-sm font-medium opacity-70">Skills</h3>
        <ul className="flex flex-wrap gap-2 text-xs opacity-80">
          {SKILLS.map((skill) => (
            <li key={skill} className="rounded border border-white/15 px-2 py-1">
              {skill}
            </li>
          ))}
        </ul>

        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {FAVOURITES.map((item) => (
            <div key={item.label} className="contents">
              <dt className="opacity-60">{item.label}</dt>
              <dd className="opacity-85">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
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
