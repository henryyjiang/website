/**
 * The two rows on the News tab that are true rather than remembered.
 *
 * `Currently watching` and `Last completed` were hand-typed in `content/about.ts`
 * until 2026-10-21, and they were wrong — on the old site and here — because the
 * only thing keeping them current was Henry editing a file after finishing an
 * episode. They are back as a fetch from the list that is already correct, which is
 * the only honest way to show a status. Everything else in the about section is a
 * favourite, which does not go stale, and stays written down.
 *
 * **AniList, not MyAnimeList.** This module was written against MAL's REST API v2
 * first, which was a guess about which site Henry keeps his list on; he keeps it on
 * AniList (2026-10-21). That is a better position to be in than it sounds, because
 * **AniList needs no credential to read a public list** — MAL wanted a registered
 * application and an `X-MAL-CLIENT-ID` header, so the integration had a secret, an
 * environment variable, and a half-configured state where the username was set and
 * the key was not. None of that exists now. The username in `content/about.ts` is
 * the whole configuration, there is nothing to put in Vercel's project settings, and
 * a fresh clone is one line away from the feature working.
 *
 * **Server-only, still.** Not for a secret any more — there isn't one — but because
 * it is a network fetch that belongs in the render rather than in the browser.
 * `app/updates/page.tsx` is a server component and is the only caller.
 *
 * **It can always fail, and failing is not an error.** No username, AniList down,
 * the list set to private, a shape that has changed under us: every one of those
 * returns `null` and the about section renders with the space held open where the
 * two rows go, which is what it did for the whole of the day before the rows went
 * live. Nothing here throws, and nothing here is allowed to fail a build — a
 * portfolio that will not deploy because someone else's API is having an afternoon
 * is a worse outcome than a missing line.
 *
 * **Which was not hypothetical: AniList's API was switched off when this was
 * written** (2026-10-21), answering every query with HTTP 403 and `The AniList API
 * has been temporarily disabled due to severe stability issues.` So it went in
 * untested against live data, with the field names and enums below taken from
 * AniList's documented schema rather than from a response.
 *
 * **It came back on 2026-10-22 and the query met the real schema for the first
 * time.** It resolved as written: both aliases, the fragment, and
 * `POINT_10_DECIMAL` reading back a `9.2`. Two things the recorded payloads had only
 * asserted turned out to be true of the live list as well — `media.title.english`
 * is genuinely `null` on entries that have no English title, so `titleOf`'s fallback
 * is load-bearing rather than defensive, and a decimal score does arrive as a float
 * that wants rounding. Nothing here changed when it came back, which is the useful
 * part of the report.
 *
 * `hint()` stays, and so does the 403 case: an API that has been off once can be off
 * again, and when the rows do not appear the only question worth answering from a
 * log line is whether the fault is here or there. `parseWatchlist` is exported and
 * pure so the half that is ours can still be checked without a network.
 *
 * **One request, two lists.** The query asks for both lists in one POST under two
 * aliases. GraphQL resolves aliases independently and returns partial `data`
 * alongside `errors`, so one list failing still leaves the other usable — the same
 * independence two separate requests would have given, for one round trip and one
 * hit against the rate limit.
 *
 * **Fetched hourly, not per request** — and that cadence lives on the route, as
 * `export const revalidate` in `app/updates/page.tsx`, not here. It has to: Next's
 * Data Cache only keys GET requests, so a `next: { revalidate }` on a GraphQL POST
 * is quietly ignored and the page would bake once at build and never move again.
 * Segment revalidation is the mechanism that actually holds.
 */

import { ANILIST_USERNAME } from '../content/about'

const ENDPOINT = 'https://graphql.anilist.co'

/**
 * Short on purpose. This runs during a build, and the failure mode to design for is
 * not an error response — it is AniList hanging, which would otherwise hold a deploy
 * open for however long the platform's default timeout is.
 */
const TIMEOUT_MS = 5_000

/** Enough to say what he is in the middle of without becoming a list. */
const WATCHING_SHOWN = 3

export type Watchlist = {
  /** Newest first. Empty when he is between shows, which is a real answer. */
  watching: readonly string[]
  lastCompleted: { title: string; score: number } | null
}

/** One row of an AniList list, reduced to what the panel shows. */
type Entry = { title: string; score: number }

/**
 * Both lists in one query.
 *
 * `CURRENT` is AniList's name for watching and `COMPLETED` for finished. Sorting by
 * `UPDATED_TIME_DESC` is what makes one entry "last completed" rather than "a
 * completed one" — by score would answer a different question, and by title would
 * answer none.
 *
 * `score(format: POINT_10_DECIMAL)` is asked for explicitly because a score's shape
 * is an account setting on AniList: Henry could have it on a 100-point or a 5-star
 * scale, and the panel renders `x/10`. Naming the format here means the readout does
 * not change meaning if he changes that setting.
 */
const QUERY = `
query Watchlist($user: String!, $watchingShown: Int!) {
  watching: Page(perPage: $watchingShown) {
    mediaList(userName: $user, type: ANIME, status: CURRENT, sort: [UPDATED_TIME_DESC]) {
      ...row
    }
  }
  completed: Page(perPage: 1) {
    mediaList(userName: $user, type: ANIME, status: COMPLETED, sort: [UPDATED_TIME_DESC]) {
      ...row
    }
  }
}

fragment row on MediaList {
  score(format: POINT_10_DECIMAL)
  media {
    title {
      english
      romaji
    }
  }
}
`

export async function fetchWatchlist(): Promise<Watchlist | null> {
  // The whole configuration. `null` means the feature is off — which is the state a
  // fresh clone is in, and it has to render.
  if (!ANILIST_USERNAME) return null

  const data = await request(ANILIST_USERNAME)
  if (!data) return null

  return parseWatchlist(data)
}

/**
 * The response body's `data`, as the two rows the panel shows.
 *
 * Separated from the fetch and exported so the parsing — the half of this that is
 * ours to get right — can be run against a recorded payload without a network.
 * Which is not a nicety while AniList is returning 403 to everything: it is the only
 * way any of this was verified before it shipped.
 *
 * Third-party JSON crossing into the site is typed `unknown` until something checks
 * it: a row that does not look like a row is skipped rather than rendered as
 * `undefined`, and a response that is not a list at all yields `null` instead of
 * throwing in the middle of a page render.
 */
export function parseWatchlist(data: unknown): Watchlist | null {
  const watching = parseMediaList(data, 'watching')
  const completed = parseMediaList(data, 'completed')

  // Both failed: say nothing rather than report half a truth as the whole one. One
  // of the two failing is fine — an empty `watching` is indistinguishable from a
  // genuinely empty list, and both read correctly.
  if (!watching && !completed) return null

  return {
    watching: (watching ?? []).map((entry) => entry.title),
    lastCompleted: completed?.[0] ?? null,
  }
}

/** One aliased page of the query, or `null` if that alias did not resolve. */
function parseMediaList(data: unknown, alias: 'watching' | 'completed'): Entry[] | null {
  if (!isRecord(data)) return null

  const page = data[alias]
  if (!isRecord(page) || !Array.isArray(page.mediaList)) return null

  const entries: Entry[] = []

  for (const row of page.mediaList) {
    if (!isRecord(row)) continue

    const title = titleOf(row.media)
    if (!title) continue

    entries.push({ title, score: scoreOf(row.score) })
  }

  return entries
}

/**
 * English title where there is one, romaji otherwise.
 *
 * That order on purpose: the readout is read by people visiting a portfolio, not
 * only by people who read romaji fluently — but `english` is genuinely `null` on
 * plenty of AniList entries, so it cannot be the only thing asked for. Swapping the
 * two names in the array below switches the whole readout, which is the entire cost
 * of changing his mind about it.
 */
function titleOf(media: unknown): string | null {
  if (!isRecord(media) || !isRecord(media.title)) return null

  for (const candidate of [media.title.english, media.title.romaji]) {
    if (typeof candidate === 'string' && candidate.trim() !== '') return candidate.trim()
  }

  return null
}

/**
 * `0` is AniList for "not rated", which is a value and not a gap — the panel decides
 * what to do with it rather than this guessing.
 *
 * `POINT_10_DECIMAL` means one decimal place, so this rounds to one rather than
 * trusting a float to print as one: a `7.800000000000001` reaching the readout would
 * be a wrong-looking score that is nobody's fault.
 */
function scoreOf(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0
  return Math.round(value * 10) / 10
}

async function request(username: string): Promise<unknown> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query: QUERY,
        variables: { user: username, watchingShown: WATCHING_SHOWN },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    // AniList sends a JSON body with its errors in it even when the status is not
    // ok, and that body is the useful half of the diagnosis, so read it either way.
    const body: unknown = await response.json().catch(() => null)
    const errors = messagesIn(body)

    if (!response.ok) {
      warn(`AniList answered ${response.status}.${errors}${hint(response.status)}`)
    } else if (errors) {
      warn(`AniList answered 200 with errors.${errors}`)
    }

    // Partial data is still data: an alias that resolved is usable even when its
    // neighbour errored, which is the whole reason both lists are one query.
    return isRecord(body) ? body.data : null
  } catch (error) {
    // A timeout arrives here as an `AbortError`, which is the expected shape of
    // "AniList is slow today" rather than anything exceptional.
    warn(error instanceof Error ? error.message : String(error))
    return null
  }
}

/** GraphQL's `errors` array, flattened to something readable in a build log. */
function messagesIn(body: unknown): string {
  if (!isRecord(body) || !Array.isArray(body.errors)) return ''

  const messages = body.errors
    .map((entry) => (isRecord(entry) && typeof entry.message === 'string' ? entry.message : null))
    .filter((message): message is string => message !== null)

  return messages.length > 0 ? ` ${messages.join(' ')}` : ''
}

/**
 * The distinction that is the whole debugging session, said out loud.
 *
 * Whether the rows are missing because of something in this repository or because of
 * something at AniList is the only question worth answering from a log line, and the
 * status code answers it.
 */
function hint(status: number): string {
  switch (status) {
    case 403:
      return (
        ' A 403 is AniList refusing the API outright — not anything about this list' +
        ' or this code. They did exactly that from 2026-10-21 until 2026-10-22, so it' +
        ' is a state they have been in before and can be in again.'
      )
    case 404:
      return ' A 404 is the username: either it is misspelled, or the list is not public.'
    case 429:
      return ' A 429 is the rate limit, which the hourly revalidation should keep us far under.'
    default:
      return ''
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function warn(message: string): void {
  console.warn(`[anilist] ${message} Those rows are omitted.`)
}
