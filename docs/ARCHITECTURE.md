# Architecture

## The shape of the problem

The site is one persistent scene with overlays drawn on top of it. That single sentence drives
most of the decisions below: the scene must survive navigation, so it cannot live inside a route;
and the overlays must be real DOM, so they cannot live inside the canvas.

## Scene coordinate space

Everything in the scene is authored against a **fixed design canvas** — `2560 × 1440` — regardless
of the viewport. Layer art is exported at that size (or a multiple of it), hotspots are defined as
rectangles in it, and the character's anchor is a point in it.

`lib/scene-space.ts` owns the only mapping from scene space to screen space:

```ts
// Scale needed to cover the viewport, plus overscan so there is room to pan.
const scale = Math.max(vw / SCENE_W, vh / SCENE_H) * OVERSCAN
```

Cover, not contain: the scene always fills the window and we pan within the overflow. The amount of
overflow available for panning is `(SCENE_W * scale - vw)` horizontally, and the camera is clamped
to it, so panning can never reveal an edge.

**Why cover alone is not enough.** The design canvas is exactly 16:9, so on a 16:9 viewport —
1920×1080 and 2560×1440, the two most common desktop sizes — cover produces *zero* overflow and
therefore zero pan. The scene would sit perfectly still for most visitors. `OVERSCAN` (1.08) draws
the scene slightly larger than the viewport so the margin always exists; the old site did the same
thing with a 1.05 zoom, expressed here where the rest of the geometry lives so the pan range stays
derivable instead of being a magic number in a mousemove handler.

The cost is that roughly 4% of each edge is off-screen at the design aspect, and the camera can
reveal it. `SAFE_AREA` in `lib/scene-layout.ts` derives the region that is visible *regardless* of
camera position, and `art/TEMPLATE.png` draws it, so art has a marked boundary to keep important
content inside.

**Why this matters.** The old site positioned hotspots in CSS percentages over an
`object-fit: cover` background. Percentages are relative to the *element*, while `cover` crops
relative to the *aspect ratio* — so the two diverged whenever the window was not the aspect the art
was drawn for, and the invisible buttons slid off the furniture. A single scene-space transform makes
that class of bug impossible: art and hotspots are in the same space by construction.

Consequence: the old site's `if (innerWidth / innerHeight > 1.6)` guard that disabled panning
entirely on narrower windows is unnecessary. Panning range shrinks continuously as the viewport
aspect approaches the scene aspect, and reaches zero on its own.

## Layer model

Layers are data, not components — and that data is **generated, not written by hand**:

```ts
type Layer = {
  id: string
  src: string
  band: 'sky' | 'skyline' | 'room' | 'near'
  z: number
}
```

`npm run art` walks the `art/` inbox and emits this list into `public/scene/manifest.json`. The
band comes from which folder a file is in; `z` comes from its filename prefix (`10-`, `20-`, …).
So adding a layer is dropping a file, reordering is a rename, and changing a layer's depth is moving
it between folders. No component changes, no hand-maintained list. See `art/README.md`.

The scene reads the manifest at runtime and never looks at `art/`.

Parallax factor comes from the band, so depth is a design decision made in one table rather than
scattered across sprites:

| Band | Factor | Contents |
| --- | --- | --- |
| `sky` | 0.10 | Gradient, clouds, distant haze |
| `skyline` | 0.30 | City, the skyscraper, the billboard |
| `room` | 1.00 | Interior walls, window frame, furniture, hotspot objects |
| `near` | 1.15 | Foreground clutter that should pop — a plant edge, the near corner of the desk |

A layer's screen offset is `cameraOffset * factor`. Near things move more than far things, which is
the correct direction for a camera pan. The effect that sells the window is the *differential*
between `room` at 1.00 and `skyline` at 0.30: as the camera moves, the skyline slides behind the
window opening the way a real view does.

The window glass itself is part of `room` — the opening is transparency in the room art, with the
`skyline` and `sky` bands composited behind it. Do not try to mask the skyline to the window shape;
let the room art's alpha do the work, and give the skyline bands enough bleed past the opening that
panning never exposes their edges.

## Camera

The camera has a **target** and a **current** position. Pointer movement writes the target; the
ticker eases current toward target each frame:

```ts
current += (target - current) * (1 - Math.exp(-SPRING * dt))
```

Exponential damping rather than a fixed-fraction lerp, so the feel is frame-rate independent —
a 144 Hz display and a 60 Hz display settle at the same speed. This is also the fix for the old
site's self-cancelling CSS transition: smoothing happens in the ticker, and no CSS transition is ever
attached to a property we write per frame.

Pointer input is read from the last known pointer position each tick, not acted on inside the
`mousemove` handler. The handler does nothing but store coordinates. That keeps input cost constant
no matter how fast events arrive, and it makes touch and gyro trivial to add later as alternative
target sources.

Under `prefers-reduced-motion`, the camera holds at centre and parallax is disabled. The scene is
still fully navigable — panning is decoration, never the only way to reach anything.

## The Pixi / React boundary

```
┌─ app/layout.tsx ─────────────────────────────────────┐
│  <SceneCanvas />   ← one Pixi app, mounted once      │
│  {children}        ← route content: overlay panels   │
└──────────────────────────────────────────────────────┘
```

**Pixi owns:** the canvas, layer sprites, the camera transform, the character `AnimatedSprite`,
hover glow filters, the ticker.

**React owns:** the three overlay panels, routing, focusable navigation, all text content.

**They talk through `lib/store.ts`** and nothing else. Pixi publishes hover state and click intent;
React publishes which overlay is open (so the scene can dim, blur or push the camera while a panel is
up). Neither side queries the other's internals.

### Hotspots: why they are built twice

Hover and clicking are handled by Pixi, using alpha-accurate hit testing against the object art.
This is the right behaviour for irregular painted objects — a rectangle over a desk catches the empty
air above it, and a hover glow that triggers off-object feels broken.

But a Pixi sprite is invisible to the accessibility tree, cannot be tabbed to, and is not a link.
So **every hotspot also exists as a visually hidden DOM `<button>` or `<Link>`** in a nav landmark.
Both paths dispatch the same navigation action.

This is deliberate duplication, and the alternative was considered and rejected: positioning real DOM
buttons over the art means either rectangular hit areas (wrong feel) or hand-maintained CSS clip
paths per object (unmaintainable as art is redrawn). Keeping interaction in Pixi and access in the
DOM costs one extra list and makes both correct. The hotspot table in `components/scene/hotspots.ts`
is the shared source for both.

## Routing

Three tabs, three real URLs: `/desk`, `/art`, `/updates`. Real routes rather than client state,
because they should be linkable, shareable and reachable by the back button.

The trap in the App Router is remounting. If the scene lives in a page, navigating destroys the Pixi
app, reuploads every texture and restarts the animation — a visible hitch on every click. So the
scene mounts in the **root layout**, which persists across route changes, and each route renders only
its overlay. Route transitions animate the panel in and out with Motion; the canvas never knows a
navigation happened beyond a store update.

`SceneCanvas` is imported through `next/dynamic` with `ssr: false`, because Pixi touches `window` and
WebGL at module scope.

## Content

Typed modules under `content/`, one per collection:

- `projects.ts` — software and AI research work, each with an ISO date. Timestamped and sorted at
  render, so ordering is never a matter of array position.
- `art.ts` — drawing portfolio pieces.
- `updates.ts` — the changelog. **One source feeding two surfaces:** the billboard carousel in the
  scene shows the most recent few, and `/updates` lists them all. The billboard must never have its
  own separate copy of this data.
- `links.ts` — socials, GitHub, résumé.

The old site's project list lived in `index.html` as ~150 lines of hand-written markup per entry.
Treating content as data is the single biggest maintainability win available here.

## Performance policy

- **Ticker stops when the tab is hidden**, via `visibilitychange`, and resyncs on return. See
  `docs/ANIMATION.md` for the failure this prevents.
- **Device pixel ratio capped at 2.** A 3× phone or 4K display otherwise renders four to nine times
  the pixels for no visible gain on painted art.
- **Textures are loaded through `Assets.load`**, which resolves after GPU upload, so the first frame
  never draws a half-ready scene.
- **WebGL unavailable** → render a static composite of the layers and skip the character. The site
  must still function as a portfolio.
- Layer art exported as WebP with a PNG fallback; budget in `docs/ANIMATION.md`.
