# Deployment and isolation

## The situation

The previous portfolio is **live on Vercel** and must stay live and unchanged while this rebuild
happens in the same working folder.

How that deployment is wired, as determined by inspection rather than assumption:

- There is **no `vercel.json`**, no `.vercel/` directory and no `.github/` workflows in this repo.
- So the deployment is a **Vercel Git-integration project** watching the GitHub repository
  **`henryyjiang/portfoliosite`**, branch `main`, serving the repository root as a zero-config
  static site.
- Nothing local pins or configures it. The only coupling is the git remote.

**That last point is the whole safety story.** Since the link is the remote and nothing else, moving
the remote severs it completely.

## What has been done

```
origin  https://github.com/henryyjiang/portfoliosite.git   (before)
origin  https://github.com/henryyjiang/website.git         (now)
```

`origin` was repointed with `git remote set-url`. Note that the `git remote add origin` form fails
here, because an `origin` already existed.

Consequences, which are worth being explicit about:

- A push from this folder **cannot reach the old repository**, so it cannot trigger a production
  deploy of the old site. There is no path from here to the live site any more.
- `henryyjiang/portfoliosite` on GitHub is **untouched** and still holds the full history of the old
  site, including every asset ever committed.
- The live deployment keeps serving from that repository until its domain is deliberately moved.

This folder is a duplicate; the original working copy of the old site is separate and also intact.

## Remaining isolation step — still open, and now the gate

**Disable the Vercel Git integration on the old project.** The remote change already makes an
accidental deploy impossible from this folder, but the old project should not be watching for
pushes that might arrive from the original folder either.

In the Vercel dashboard, on the `portfoliosite` project: Settings → Git → disconnect, or pause the
project. Pausing keeps the existing deployment serving while ignoring new commits.

This was a background precaution while the rebuild was in flight. It is the **first step of the
cutover** now, and it should be done before a second project exists on the same account pointing at
the same work — not after.

## Git history: settled

`main` on `henryyjiang/website` is a **fresh history** — option 1 of the two that were open here.
It starts at `f9e97fe` and carries none of the old repository's 55 commits, so the 72 MB of
re-committed PNG character frames that inflated `portfoliosite` is not in a clone of this one.

Nothing was lost by that, which was the whole argument for it: `henryyjiang/portfoliosite` still
holds the complete record of the old site.

**The old site's files were deleted from `main` on 2026-10-21** — `index.html`, `main.js`,
`style.css`, `assets/` and a root `resume.pdf` that was a byte-identical duplicate of the
`public/resume.pdf` the site actually serves. 3.4 MB, carried since the root commit and served by
nothing: Next serves `public/`, and none of it was under `public/`. The local `archive/old-site`
branch went with them.

Two things worth being explicit about, because both are one-way:

- That branch was never pushed. `portfoliosite` was the only other copy, and **deleting that
  repository would leave no copy of the old site at all.**
- `assets/` is still reachable in `main`'s *history*, at the root commit. Deleting the files does
  not shrink a clone. Rewriting history to drop them is possible and is not worth it for a few MB.

## Environment

Nothing here is required. The site builds and renders with none of it set; each feature is simply
absent. `.env.example` is the full list with the reasoning.

| Variable | Where | Effect if unset |
| --- | --- | --- |
| `MAL_CLIENT_ID` | Vercel project settings | The Blog tab's watchlist rows do not render |
| `NEXT_PUBLIC_SITE_URL` | Vercel project settings | The link preview names Vercel's own production host |

`MAL_CLIENT_ID` has a second half that is **not** an environment variable: `MAL_USERNAME` in
`content/about.ts`, which is `null` on `main`. A username is public and is a fact about Henry, so it
is content; a client id is a credential. Both or neither — one alone does nothing.

`NEXT_PUBLIC_SITE_URL` is only worth setting once a custom domain is attached. Until then
`lib/site.ts` falls back to `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel sets on every deployment
and which is correct from the first one.

## Target setup

When the rebuild is ready (Phase 6):

- A **new Vercel project** on `henryyjiang/website`, framework preset Next.js, default build
  (`next build`). Preview deployments on branches; production on `main`.
- Verify on the Vercel-assigned domain first, while the old site still holds the real domain.
- **Then** move the custom domain from the old project to the new one.
- **Then** retire the old project. Keep the `portfoliosite` repository — it is the archive of the
  previous site and of this one's history.

Until that cutover, the new project's deployments are only ever reachable at Vercel preview URLs.
