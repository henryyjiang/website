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

## Remaining isolation step

**Disable the Vercel Git integration on the old project** while the rebuild is in flight, as a
second layer of protection. The remote change already makes an accidental deploy impossible from
here, but the old project should not be watching for pushes that might arrive from the original
folder either.

In the Vercel dashboard, on the `portfoliosite` project: Settings → Git → disconnect, or pause the
project. Pausing keeps the existing deployment serving while ignoring new commits.

## Git history: the open decision

Pushing this folder's current `main` to the new repository would carry **55 commits and a 100 MB
`.git`**, of which:

- **72 MB is the PNG character frame sequence** — 370 blob references, so it was committed more than
  once as it was re-rendered. This is the exact asset pattern `docs/ANIMATION.md` bans going forward.
- Roughly 10 further files exist only in history and not on disk (`Backboard.pdf`, `assets/ikfk.png`,
  `assets/smartselect.png`, and others).

The relevant fact: **the old repository preserves all of it.** Shedding history in the new repository
loses nothing, because `henryyjiang/portfoliosite` keeps the full record.

Options:

1. **Fresh history** — start the new repository at one clean commit. Small, fast to clone, no dead
   weight. The old site's evolution stays available at the old repository.
2. **Carry history** — push all 55 commits. Keeps the old site's development in the new repository
   too, at the cost of permanently carrying 72 MB of superseded frame data in every clone.

Option 1 is recommended, precisely because nothing is lost by it.

## Target setup

When the rebuild is ready (Phase 6):

- A **new Vercel project** on `henryyjiang/website`, framework preset Next.js, default build
  (`next build`). Preview deployments on branches; production on `main`.
- Verify on the Vercel-assigned domain first, while the old site still holds the real domain.
- **Then** move the custom domain from the old project to the new one.
- **Then** retire the old project. Keep the `portfoliosite` repository — it is the archive of the
  previous site and of this one's history.

Until that cutover, the new project's deployments are only ever reachable at Vercel preview URLs.
