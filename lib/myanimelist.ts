/**
 * The two rows on the Blog tab that are true rather than remembered.
 *
 * `Currently watching` and `Last completed` were hand-typed in `content/about.ts`
 * until 2026-10-21, and they were wrong — on the old site and here — because the
 * only thing keeping them current was Henry editing a file after finishing an
 * episode. They are back as a fetch from the list that is already correct, which is
 * the only honest way to show a status. Everything else in the about section is a
 * favourite, which does not go stale, and stays written down.
 *
 * **Server-only.** This reads `MAL_CLIENT_ID` out of the environment, so it must
 * never be imported from a client component — the id would be inlined into the
 * bundle. `app/updates/page.tsx` is a server component and is the only caller.
 *
 * **It can always fail, and failing is not an error.** No credential, no username,
 * MyAnimeList down, a shape that has changed under us: every one of those returns
 * `null` and the about section renders without those two rows, exactly as it does
 * today. Nothing here throws, and nothing here is allowed to fail a build — a
 * portfolio that will not deploy because someone else's API is having an afternoon
 * is a worse outcome than a missing line.
 *
 * **Fetched once an hour, not once a request.** The `revalidate` makes this an
 * ordinary Next data fetch: the page is still prerendered, the hit happens on
 * revalidation rather than in front of a reader, and a stale page is served while
 * it happens. Which also keeps us far inside MAL's rate limits — two requests an
 * hour, not two per visitor.
 */

import { MAL_USERNAME } from '../content/about'

const BASE = 'https://api.myanimelist.net/v2'

/** Anime does not air faster than this, and it keeps us to two requests an hour. */
const REVALIDATE_SECONDS = 60 * 60

/**
 * Short on purpose. This runs during a build, and the failure mode to design for is
 * not an error response — it is MyAnimeList hanging, which would otherwise hold a
 * deploy open for however long its default timeout is.
 */
const TIMEOUT_MS = 5_000

/** Enough to say what he is in the middle of without becoming a list. */
const WATCHING_SHOWN = 3

export type Watchlist = {
  /** Newest first. Empty when he is between shows, which is a real answer. */
  watching: readonly string[]
  lastCompleted: { title: string; score: number } | null
}

/** One row of a MAL list, reduced to what the panel shows. */
type Entry = { title: string; score: number }

export async function fetchWatchlist(): Promise<Watchlist | null> {
  const clientId = process.env.MAL_CLIENT_ID

  // Two halves of one setting, in the two right places: the credential is a secret
  // and lives in the environment, the username is public and is content about
  // Henry. Either one missing means the feature is simply off — which is the state
  // a fresh clone is in, and it has to render.
  if (!clientId || !MAL_USERNAME) return null

  const [watching, completed] = await Promise.all([
    list(clientId, MAL_USERNAME, 'watching', WATCHING_SHOWN),
    list(clientId, MAL_USERNAME, 'completed', 1),
  ])

  // Both failed: say nothing rather than report half a truth as the whole one. One
  // of the two failing is fine — an empty `watching` is indistinguishable from a
  // genuinely empty list, and both read correctly.
  if (!watching && !completed) return null

  const last = completed?.[0] ?? null

  return {
    watching: (watching ?? []).map((entry) => entry.title),
    lastCompleted: last ? { title: last.title, score: last.score } : null,
  }
}

async function list(
  clientId: string,
  username: string,
  status: 'watching' | 'completed',
  limit: number,
): Promise<Entry[] | null> {
  const url = new URL(`${BASE}/users/${encodeURIComponent(username)}/animelist`)
  url.searchParams.set('status', status)
  // Most recently touched first, which is what makes one entry "last completed"
  // rather than "a completed one". Sorting by score would answer a different
  // question, and by title would answer none.
  url.searchParams.set('sort', 'list_updated_at')
  url.searchParams.set('limit', String(limit))
  // Without this the rows come back as bare nodes and the score is missing.
  url.searchParams.set('fields', 'list_status')

  try {
    const response = await fetch(url, {
      // Client-id auth, not OAuth: this reads one public list and never acts as
      // Henry, so there is no token to store, refresh, or leak.
      headers: { 'X-MAL-CLIENT-ID': clientId },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    })

    if (!response.ok) {
      // 403 here almost always means the list is set to private rather than that
      // the credential is wrong, and that distinction is the whole debugging
      // session, so say it.
      warn(
        `${status}: MyAnimeList answered ${response.status}. ` +
          `A 401 is the client id; a 403 is usually the list's privacy setting.`,
      )
      return null
    }

    return parseAnimeList(await response.json())
  } catch (error) {
    warn(`${status}: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

/**
 * The response, narrowed to the two fields the panel uses.
 *
 * Hand-written rather than trusted, and exported so it can be run against a real
 * payload without a network. This is third-party JSON crossing into the site: it is
 * typed as `unknown` until something checks it, a row that does not look like a row
 * is skipped rather than rendered as `undefined`, and a response that is not a list
 * at all returns null instead of throwing in the middle of a page render.
 *
 * `score` is 0 on MyAnimeList for "not rated", which is a value and not a gap — the
 * panel decides what to do with it rather than this guessing.
 */
export function parseAnimeList(payload: unknown): Entry[] | null {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return null

  const entries: Entry[] = []

  for (const row of payload.data) {
    if (!isRecord(row)) continue

    const node = row.node
    if (!isRecord(node) || typeof node.title !== 'string' || node.title === '') continue

    const listStatus = row.list_status
    const score =
      isRecord(listStatus) && typeof listStatus.score === 'number' ? listStatus.score : 0

    entries.push({ title: node.title, score })
  }

  return entries
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function warn(message: string): void {
  console.warn(`[myanimelist] ${message} Those rows are omitted.`)
}
