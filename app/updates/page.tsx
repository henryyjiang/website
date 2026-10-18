import { OverlayPanel } from '@/components/overlay/OverlayPanel'
import { byDateDesc } from '@/content/types'
import { UPDATES } from '@/content/updates'

/**
 * The full changelog.
 *
 * Reads the same `content/updates.ts` the billboard carousel does — one source, two
 * surfaces (docs/CONTENT.md). This page is also the accessible copy of what the
 * billboard shows, since canvas text is not in the accessibility tree.
 *
 * Design is Phase 4.
 */
export default function UpdatesPage() {
  const updates = byDateDesc(UPDATES)

  return (
    <OverlayPanel title="Updates">
      <ol className="flex flex-col gap-5">
        {updates.map((update) => (
          <li key={`${update.date}-${update.title}`} className="flex flex-col gap-1">
            <time dateTime={update.date} className="text-xs opacity-60">
              {formatDate(update.date)}
            </time>
            <h2 className="font-medium">
              {update.href ? (
                <a href={update.href} target="_blank" rel="noreferrer" className="underline">
                  {update.title}
                </a>
              ) : (
                update.title
              )}
            </h2>
            {update.body ? <p className="text-sm opacity-80">{update.body}</p> : null}
          </li>
        ))}
      </ol>
    </OverlayPanel>
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
