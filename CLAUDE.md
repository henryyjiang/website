# Portfolio v2

An interactive portfolio: a painted apartment with floor-to-ceiling windows, a city skyline
behind the glass, and an animated character in the room. Objects in the room are the navigation.
The scene pans with the mouse and parallaxes between background and foreground.

This is a **ground-up replacement** of the previous vanilla HTML/CSS/JS site, not a refactor.
Do not port the old `main.js` / `style.css` approach — see `docs/ANIMATION.md` for why it failed.

## Stack

| Concern | Choice | Version at setup |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16.4.2 |
| UI | React | 19.3.1 |
| Scene rendering | Pixi.js (WebGL 2D) | 8.22.0 |
| React↔Pixi bridge | `@pixi/react` | 8.0.5 |
| Scene filters | `pixi-filters` (glitch, RGB split) | 6.1.5 — subpath imports only |
| Overlay animation | Motion | 14.3.0 |
| Language | TypeScript (strict) | 7.0.2 — see below |
| Styles | Tailwind | 4.3.3 |
| Host | Vercel | — |

### TypeScript is installed side by side — do not "fix" it

`package.json` looks wrong and is not:

```json
"@typescript/native": "npm:typescript@7.0.2",
"typescript": "npm:@typescript/typescript6@6.0.2"
```

TypeScript 7 is the native (Go) compiler and does not expose the JS API that typescript-eslint
needs. So `@typescript/native` provides the `tsc` binary that `npm run typecheck` actually runs —
verify with `npx tsc --version`, which reports 7.0.2 — while the `typescript` entry provides the
6.0.2 JS API for the linter. This is Microsoft's documented side-by-side layout, and it is the
alternative to downgrading the compiler.

**Repointing `typescript` to 7.x breaks `npm run lint`.** If a dependency change makes this
arrangement unnecessary, confirm `typecheck`, `lint` and `build` all pass before simplifying it.

**Division of labour, and it is not negotiable:** Pixi owns exactly one canvas and everything
inside the scene — layers, parallax, the character, hover glow. React owns everything in the DOM —
the three tab overlays, routing, accessible navigation. They communicate through a small store, never
by reaching into each other. `docs/ARCHITECTURE.md` has the details.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build; must pass before any push
npm run start        # serve the production build locally
npm run typecheck    # tsc --noEmit
npm run lint
npm run art          # import art/ → public/scene/ + public/images/ (optimise, pack atlas, write manifests)
```

## Layout

```
app/                  Next routes. Scene mounts once in the root layout and never remounts.
  layout.tsx          Persistent shell + <Scene /> (client-only)
  page.tsx            Room, no overlay open
  desk/               Software + AI research overlay
  art/                Drawing portfolio overlay
  updates/            News overlay (route name kept; the nav labels it News)
components/
  scene/              Pixi: layers, parallax camera, character, hotspots, glow
  overlay/            React: the three tab panels and shared chrome
  nav/                React: the destination tabs — the DOM half of the hotspots
  theme/              React: the route-change glitch
lib/
  scene-space.ts      Scene↔screen coordinate maths. Single source of truth.
  theme.ts            The palette. Every colour in the site, by role, in one table.
  store.ts            Shared state between Pixi and React
  content-images.ts   Joins a content entry to its image by slug. Reads the manifest below.
  post-target.ts      Where a blog post points: the Coding row, or the Art popup.
  anilist.ts          The News tab's watchlist rows. Server-only; off without a username.
content/              Typed content modules. All copy and project data lives here.
art/                  ART INBOX. Henry drops exports here; see art/README.md.
public/scene/         Build output: optimised layers, packed atlases, manifest. Generated.
public/images/        Build output: the images content/ refers to, + manifest. Generated.
scripts/import-art.ts Converts art/ → public/scene/ and public/images/. Run via npm run art.
docs/
```

## The art inbox

`art/` is where art enters the project, and it is the interface between Henry's drawing software and
the code. Adding, replacing or reordering a layer must never require touching a component.

```
art/background/sky.png     parallax 0.10   (placeholder until Henry draws one)
art/background/skyline.png parallax 0.30   (city and the skyscraper)
art/foreground/            parallax 1.00   (the room: walls, window frame, floor)
art/objects/               desk.png, bed.png — plus billboard.png, which is a shape only
art/character/             frame sequence, video, or pre-packed atlas
art/projects/              one screenshot per project, named after its slug
art/pieces/                one drawing — or video — per art piece, named after its slug
art/icon.png               the favicon; one square drawing
```

The last three are **not scene art** and take none of the rules above — no canvas size, no band, no
draw order. The first two are pictures belonging to something written in `content/`, joined to it by
the filename matching the entry's `slug`, and they land in `public/images/` rather than the scene's
tree. `icon.png` belongs to no entry at all: the import resizes it into `app/icon.png` and
`app/apple-icon.png`, where Next's file convention finds it, hashes it and writes the `<link>` tags
— so the favicon is a drop-in like everything else and no path is written down. A piece may be a video, in which case the import also produces the thumbnail everything that
is not playing it shows. **Posts have no inbox**: a post borrows the picture of whatever it
points at. See `docs/CONTENT.md` § Images.

Rules enforced by this layout, all of them read from `art/README.md` rather than hardcoded:

- **The band is a filing decision, not a code change.** A layer names its band — `skyline.png` —
  or sits in a folder named after it. Either way, changing a layer's depth is a rename or a move.
- **Filename prefix determines draw order** within a band (`10-`, `20-`, `30-`), so reordering is a
  rename. Optional: a band with one layer has nothing to order.
- **Layers export at the full 2560 × 1440 design canvas** with transparency around the content, so
  art and hit areas share one coordinate space by construction.

`npm run art` reads `art/`, writes optimised assets and a manifest to `public/scene/` (the scene) and
`public/images/` (the content's pictures), and packs the character animation into an atlas
regardless of which of the three input formats was supplied. The scene fetches its manifest at
runtime and the panels import theirs at build time; neither ever reads `art/`.

**Never read from `art/` in application code**, and never hand-maintain the manifest.

## Rules

**No component names a colour.** Every colour is a role in `lib/theme.ts`, reaching the DOM as a CSS
custom property and the scene as a number. Changing the whole theme is changing `DEFAULT_PALETTE`.
A literal hex or a Tailwind palette class in a component breaks that and will be moved.

**Content is data, never markup.** The old site hardcoded every project into `index.html`.
Projects, art pieces and posts live in `content/` as typed arrays. Adding a project means editing
one object, and it must not require touching a component. Projects carry timestamps.

**No content entry writes an image path.** Words live in `content/`, pixels live in `art/`, and
`slug` joins them: the import names the output after the slug and `lib/content-images.ts` resolves
it back. A path typed into a content module is a second source of truth that goes stale silently —
the eight project screenshots carried over from the old site all 404'd for exactly that reason.

**One source of truth for position.** Every layer, hotspot and character anchor is authored in
scene coordinates (a fixed design canvas) and mapped to the screen by `lib/scene-space.ts`. Never
position a scene element in viewport percentages — that is what made the old hotspots drift out of
alignment with the art as the window aspect changed.

**Never animate a property you also write every frame.** The old site set
`wrapper.style.transform` on every `mousemove` while CSS had a `transition` on `transform`, so each
event restarted the previous interpolation. Smoothing belongs in the ticker as a damped lerp toward a
target, never in a CSS transition.

**Pixi is client-only.** It touches `window` and WebGL at import time. Load scene components through
`next/dynamic` with `ssr: false`. A Pixi import that leaks into a server component breaks the build.

**Assets have a budget.** See `docs/ANIMATION.md`. Loose PNG frame sequences are never *shipped or
committed* — they are what broke the old site and what inflated its git history to 100 MB. A
sequence dropped into `art/character/sequence/` is a fine *input*; `npm run art` packs it into an
atlas, and only the atlas is committed.

**Respect the user's machine.** Honour `prefers-reduced-motion`, stop the ticker when the tab is
hidden, cap device pixel ratio, and degrade to a static composite where WebGL is unavailable.

**Expensive effects are computed at build time, not per frame.** Object glow is a pre-blurred
texture written by `npm run art`, not a `BlurFilter` running while something is hovered. The runtime
blurs that remain are bounded and named in `docs/ARCHITECTURE.md` § Performance policy. A filter
attached to an idle scene costs a render target every frame it exists, so filters attach when an
effect starts and detach when it ends.

**Surfaces on an object are measured, never typed.** Where the billboard's carousel projects is the
object's own four measured corners, the same way its hit area is its own alpha. A rectangle in a
config file is a second source of truth that goes stale the first time the art moves, silently.

**`art/objects/billboard.png` is a shape, not art, and nothing draws it.** The billboard's screen is
no longer painted into the skyline — Henry removed it on 2026-10-21 once the carousel was landing on
the right corners — so this file is the only record of where that screen is. The import measures its
hit area, its four corners and its inner rect, and the renderer never loads its pixels
(`components/scene/hotspots.ts` § `drawn`). Only its alpha matters: if the billboard moves, export a
solid fill at the new position on the full canvas. `npm run art:placeholders` used to trace it out
of the skyline and can no longer — it warns and leaves the file alone, which is the end state rather
than a breakage.

## Phase discipline

Work proceeds in the order in `docs/ROADMAP.md`. The rough-layout phase is **done** and the real
scene art landed on 2026-10-20, so the seams it was built for are now being used: glow, the billboard
carousel and the theme all hang off the manifest rather than off components. The character
animation is still outstanding and was **not a ship blocker**: Phase 9 went live without Phase 8 on
2026-10-21, at `henryjiang.vercel.app`. (This sentence used to number those two phases 10 and 9,
which matched nothing in `docs/ROADMAP.md` — the launch is Phase 9 and the character is Phase 8.)

**The visual direction is settled: cyberpunk, in the register of Cyberpunk 2077's loading screen**,
with a glitch as the route transition and a palette measured out of Henry's own skyline art. See
`docs/DESIGN.md`. "Away from retro" still stands and means away from pixel/CRT/VHS nostalgia — it
does not rule out this glitch, which is the clean digital kind.

**Panel interiors are settled, one shape per tab** (2026-10-21, `docs/DESIGN.md` § Panel interiors).
Coding is chronological rows of image-plus-text box; News is a brief about section over condensed
news links that point *into* the site; Art is a grid of wide 16:9 cards opening a full-page popup
on the glitch.
Each tab is arranged differently on purpose — the three work areas are peers but they are not the
same kind of thing to read.

**One thing on the site is fetched rather than written: the News tab's watchlist rows**, from
AniList (`lib/anilist.ts`, `docs/CONTENT.md` § The watchlist). It needs **no credential** — AniList
serves a public list unauthenticated, so `ANILIST_USERNAME` in `content/about.ts` is the whole
configuration and there is nothing to set in the environment. It is `null` on `main`, so the rows
are absent and everything else renders — which is the state of a fresh clone, so do not "fix" a
build that is not showing them. The News tab keeps the heading and two empty rows where they will
go (2026-10-21), so an absent watchlist now looks like a section waiting for data rather than
nothing at all. Everything else on the site is a content module.

It was written against MyAnimeList until 2026-10-21 and rewritten for AniList, which is where
Henry's list actually is; that rewrite deleted `MAL_CLIENT_ID` rather than replacing it. **AniList's
API is disabled at their end as of 2026-10-21** (403, "temporarily disabled due to severe stability
issues"), so the pipeline is written but unverified against live data and the rows cannot appear
yet. Do not take the missing rows as a bug here, and do not reintroduce an environment variable
for it.

**What is in `content/` is a mix of real work and placeholders, and the placeholders are marked.**
The Art tab is entirely real: `my-first-animation` and `current-wip-animation`, both 2D animations,
which are also the first things to exercise the video path in anger. The Coding tab was cut from
eight entries to two on 2026-10-21 — `quantconnect-models`, which merges the two QuantConnect
strategies into one row, and the POTS predictor — and then two filler entries were added the same
day: `cortex-rdm-paper` and `gsoc-blender-contributions`. Those two carry Henry's titles and dates
and a placeholder blurb, and neither has a screenshot in `art/projects/` yet, so the import warns
and the rows render without a picture. In `content/posts.ts` every title and date is Henry's and
every `body` is a placeholder, which shows nowhere because `body` is not rendered.

**A piece's `date` is when the animation was made, not when it was added.** Both were read off the
source files' `creation_time` rather than typed, which is why `my-first-animation` is dated
2025-07-09 while the post announcing it is dated 2026-10-21. The grid sorts on that date and shows
it nowhere, so a guessed one is invisible and wrong (`content/types.ts`).

The third filler, a *video* piece standing in with a clip of the reference footage, was deleted on
2026-10-21 because it could not ship: its files were gitignored by name, but the generated
`public/images/manifest.json` naming them was committed, so a clean clone — which is what Vercel
builds — served an Art card whose poster and video both 404'd, with a green build and no warning.
The video path through `npm run art` is still exercised the moment a real `.mp4` lands in
`art/pieces/`. **Never gitignore an output the committed manifest names.**
