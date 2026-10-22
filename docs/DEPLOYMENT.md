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

## The isolation step — done on 2026-10-21

**Disable the Vercel Git integration on the old project.** The remote change already made an
accidental deploy impossible from this folder, but the old project should not have been watching for
pushes that might arrive from the original folder either.

In the Vercel dashboard, on the `portfoliosite` project: Settings → Git → **Disconnect**.

**Do not pause the project instead.** An earlier version of this line offered pausing as an
equivalent, on the belief that it keeps the existing deployment serving while ignoring new commits.
It does not: a paused project answers visitors with `503 DEPLOYMENT_PAUSED`, so pausing is
indistinguishable from taking the live site down. Pausing is a spend-management control, not a
deploy freeze. Disconnecting is the operation that stops new commits from building while leaving the
current production deployment serving the domain.

This was a background precaution while the rebuild was in flight, and it became the first step of
the cutover. `portfoliosite` was disconnected from the Vercel project on 2026-10-21, and `website`
connected in its place.

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
| `NEXT_PUBLIC_SITE_URL` | Vercel project settings | The link preview names Vercel's own production host |

**There is one variable, and the watchlist is not it.** The News tab's watchlist reads AniList,
which serves a public list unauthenticated, so its one setting is `ANILIST_USERNAME` in
`content/about.ts` — content rather than configuration, because a username is public and is a fact
about Henry. It is `null` on `main`. Nothing about that feature belongs in Vercel's project
settings; a `MAL_CLIENT_ID` lived here until 2026-10-21, when the integration moved to AniList and
the credential stopped existing, and that is the only reason anyone would come looking for a key
(`docs/CONTENT.md` § The watchlist).

`NEXT_PUBLIC_SITE_URL` is only worth setting once a custom domain is attached. Until then
`lib/site.ts` falls back to `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel sets on every deployment
and which is correct from the first one.

## The cutover, as it actually happened — 2026-10-21

The plan above this line, for most of the rebuild, was a **second Vercel project** on `website`,
verified on its own `.vercel.app` URL while the old site kept the real one, then a domain move, then
retiring the old project. That is not what was done, and the record is worth keeping straight.

**The existing Vercel project was repointed instead.** Settings → Git → disconnect `portfoliosite`,
connect `website`. One project, one URL, no transfer.

That turned out to be the better shape for this site, for a reason the plan had missed: **there is
no custom domain.** The real address is `henryjiang.vercel.app`, which is Vercel's own
project-scoped subdomain and is therefore a property of the *project*, not something attachable to a
new one. A second project could never have served it. So the domain move and the "retire the old
project" step were both moot — the project never changed identity, and nothing had to be moved.

What that shape costs is the verify-first window. With one project there is no staging URL to check
while the old build still serves: the first green build from `website` *is* production. That was an
acceptable trade here only because the build had been verified independently — `git archive HEAD`
into an empty directory, `npm ci`, `npm run build`, green with all eight routes prerendered.

### Connecting a repository does not deploy anything

The step that caused real confusion, and the one worth remembering:

**Connecting a Git repository to an existing Vercel project triggers no build.** It arms the
trigger and waits for the next push to the production branch. For thirteen minutes the project was
connected to `website` while production still served the **May 11th `portfoliosite` build**, which
looked exactly like a failed cutover and was not one. `058ea79`, pushed at 15:35, produced the first
build from `website` and went live.

A push that produces *no* deployment is a different fault. Vercel's own ordering of causes, which is
the order to work through: the **Git login connection** under Account Settings → Authentication
(their most common cause by some margin), then Settings → Git → **Ignored Build Step**, then the
**production branch**, then whether the Vercel GitHub App was installed against *selected
repositories* only — a live possibility here, since it was first installed for `portfoliosite`.

### Two things that stay true

**Keep the `portfoliosite` repository.** With the project repointed away from it, that repository is
now the only copy of the old site anywhere — it is no longer deployed, and the old site's files were
deleted from this repository's `main`. Deleting it would leave no copy at all.

**If a custom domain is ever attached and later moved, never remove it from its current project
first.** It is the obvious-looking order and it is the one that drops traffic: between the remove and
the add, the domain is attached to nothing. The domain is *added* to the destination project, which
raises a **Move Domain** confirmation naming both; Vercel's guidance is explicit that deleting it
first interrupts traffic. `vercel domains move` is not this operation either — it moves ownership
between teams.
