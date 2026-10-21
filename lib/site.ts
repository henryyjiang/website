/**
 * Where this deployment lives.
 *
 * Open Graph and Twitter cards are fetched by scrapers that do not resolve relative
 * URLs, so Next needs an absolute origin to resolve `openGraph.images` against —
 * that is what `metadataBase` is. Getting it wrong does not break the page, it
 * breaks the link preview, which is the one part of the site nobody tests by looking
 * at it.
 *
 * It cannot be a constant, because one build serves three origins: a Vercel preview
 * URL, the production domain and localhost. So it is resolved, in this order:
 *
 *   1. `NEXT_PUBLIC_SITE_URL`, if set. Set this in Vercel's project settings once a
 *      custom domain is attached, so that previews and production both advertise the
 *      canonical origin rather than whichever host happened to build them.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel sets on every deployment and
 *      which names the project's production domain — the `.vercel.app` one until a
 *      custom domain exists. Deliberately this rather than `VERCEL_URL`: the latter
 *      is the individual deployment's own hostname, so every preview would advertise
 *      a card pointing at itself and the previews are not meant to be shared.
 *   3. `http://localhost:3000`, for `npm run dev`.
 *
 * See docs/DEPLOYMENT.md.
 */
function resolveOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (production) return `https://${production}`

  return 'http://localhost:3000'
}

export const SITE_ORIGIN = resolveOrigin()
