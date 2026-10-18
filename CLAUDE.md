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
| Overlay animation | Motion | 14.3.0 |
| Language | TypeScript (strict) | 7.0.2 |
| Styles | Tailwind | 4.3.3 |
| Host | Vercel | — |

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
```

## Layout

```
app/                  Next routes. Scene mounts once in the root layout and never remounts.
  layout.tsx          Persistent shell + <Scene /> (client-only)
  page.tsx            Room, no overlay open
  desk/               Software + AI research overlay
  art/                Drawing portfolio overlay
  updates/            Changelog overlay
components/
  scene/              Pixi: layers, parallax camera, character, hotspots
  overlay/            React: the three tab panels and shared chrome
lib/
  scene-space.ts      Scene↔screen coordinate maths. Single source of truth.
  store.ts            Shared state between Pixi and React
content/              Typed content modules. All copy and project data lives here.
public/scene/         Exported web assets: layer PNGs/WebPs, character atlases
art-src/              Working art files. Gitignored. Never committed.
docs/
```

## Rules

**Content is data, never markup.** The old site hardcoded every project into `index.html`.
Projects, art pieces and updates live in `content/` as typed arrays. Adding a project means editing
one object, and it must not require touching a component. Projects carry timestamps.

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

**Assets have a budget.** See `docs/ANIMATION.md`. Frame sequences as loose PNGs are banned —
they are what broke the old site and what inflated its git history to 100 MB. Character animation
ships as a packed atlas.

**Respect the user's machine.** Honour `prefers-reduced-motion`, stop the ticker when the tab is
hidden, cap device pixel ratio, and degrade to a static composite where WebGL is unavailable.

## Phase discipline

Work proceeds in the order in `docs/ROADMAP.md`. We are currently building toward a **rough**
layout — placeholder art, correct structure. Real art and the character animation arrive later, from
Henry. Do not polish visuals or build out tab interiors ahead of their phase; the seams for swapping
art matter more than how the placeholders look.

Tab interior design is deliberately undecided. Do not invent one — the direction is
"less retro, more flowy and energetic" and nothing more specific has been settled.
