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

The same command writes a second manifest, `public/images/manifest.json`, for the images the
*content* refers to — project screenshots, art pieces, blog post images. Those are not layers and
are deliberately not in this one: they have no band, no hit area and no place in the draw order, and
the panels that show them import their manifest at build time rather than fetching it. The split
also keeps the layers' base64 alpha masks out of the panels' bundle. See `docs/CONTENT.md` § Images.

Parallax factor comes from the band, so depth is a design decision made in one table rather than
scattered across sprites:

| Band | Factor | Contents |
| --- | --- | --- |
| `sky` | 0.10 | Gradient, clouds, distant haze |
| `skyline` | 0.30 | City, the skyscraper, the billboard |
| `room` | 1.00 | Interior walls, window frame, furniture, hotspot objects |
| `near` | 1.15 | Foreground clutter that should pop — a plant edge, the near corner of the desk. Nothing in it yet; `art/foreground/near/` opts in |

A layer's screen offset is `cameraOffset * factor`. Near things move more than far things, which is
the correct direction for a camera pan. The effect that sells the window is the *differential*
between `room` at 1.00 and `skyline` at 0.30: as the camera moves, the skyline slides behind the
window opening the way a real view does.

The window glass itself is part of `room` — the opening is transparency in the room art, with the
`skyline` and `sky` bands composited behind it. Do not try to mask the skyline to the window shape;
let the room art's alpha do the work, and paint the background bands to all four edges of the canvas
so that sliding behind the opening never runs out of city. Bands at or below 1.00 need no bleed past
the canvas: a band travels `panRange * factor` while the overflow hiding it is `panRange`, so only
`near` can overshoot. `bandBleed()` in `lib/scene-space.ts` is the arithmetic.

## Objects and surfaces

An **object** is a hotspot: `desk`, `bed`, `billboard`. One file each in `art/objects/`, full canvas
with transparency around it. The import measures everything it needs out of that alpha, and nothing
is typed by hand:

- **`bounds`** — tight box around the drawn pixels. A cheap reject before the mask.
- **`mask`** — a 1-bit alpha mask at 1/8 scale, so hit testing matches the shape that was drawn
  rather than a rectangle around it.
- **`inner`** — the largest axis-aligned rectangle that fits inside it, for anything laid out in a
  box.
- **`quad`** — the four extreme corners, clockwise from top-left, pushed two units outward.
  Meaningful for a flat surface seen in perspective, ignored by everything else.
- **`glow`** — a pre-blurred, saturation-boosted copy of the object's own art, written as its own
  texture, shaped by that object's `GlowSpec` in `components/scene/hotspots.ts`. See
  `docs/DESIGN.md` § Lighting and glow for why the blur happens here and not at runtime, and why
  `gain` rather than `blur` is the knob that makes a glow stronger.

**`quad` is what the billboard carousel needs.** Henry drew the billboard in perspective — a taller
left edge than right, sloping top and bottom — so a post image dropped into `inner` would sit visibly
flat against art that is not. The carousel is a `PerspectiveMesh`, which takes exactly four corners,
and those corners are the object's own. Move the billboard, re-run the import, and the carousel
follows.

The corners are the extreme points along the two diagonals, which is right for the quads a screen is
made of and would be wrong for a region with a concave notch. Surfaces are quads; if one ever needs
to be a polygon, that is a new kind of thing, not a looser version of this one.

**Only the mask is measured at 1/8 scale.** `bounds`, `inner` and `quad` are measured at full
resolution, and the difference is not academic: measuring the corners off the mask quantised each one
to 8 scene units, which left up to 5.5 units of the billboard's unlit peach screen showing down the
right-hand side of every projected image, and — because the four corners rounded in different
directions — tilted the perspective the image was projected at. A mask cell either catches a pointer
or does not, and erring generous there is correct. A corner the carousel is pinned to has to be the
corner.

**The quad is then pushed two units outward from its own centre**, so it overhangs rather than falls
short. An alpha threshold always lands inside the painted edge, with the anti-aliased ramp beyond it
uncounted; for a projection, a pixel short is a line of unlit screen along an edge and a pixel over
lands on the black frame drawn around it, where nothing can see it. The direction to fail in is
chosen rather than inherited from a threshold.

### The billboard object is the surface, not the billboard

Worth stating because it looks like an inconsistency. The billboard — frame, neon bars, lettering,
the strip underneath — is painted into `art/background/skyline.png` and stays there.
`art/objects/billboard.png` holds only the **screen**, and as of 2026-10-21 it is a shape and nothing
else: the screen is not painted into the city at all any more, nothing draws the object, and the
file exists so that the import can measure where the screen is. The renderer does not even load its
texture (`components/scene/hotspots.ts` § `drawn`), which saves two full-canvas uploads for art
nobody would see.

It was traced out of the skyline by `npm run art:placeholders` while the screen was still painted
there, which is why it exists at all; that script can no longer find a surface to trace and says so.
The replacement is simpler than the tracer: only the alpha is read, so a solid fill at the right
position is a complete object.

That is enough, because what a hotspot actually needs from the art is a shape, not pixels:

| Needs | Comes from |
| --- | --- |
| Where you click to open the blog | the object's mask — the screen, which is the natural target |
| Where the carousel projects | the object's `quad` |
| The glow behind the carousel | the post image, blurred — not static art |
| What shows before a post loads | the object's own pixels, which are the unlit screen |

Because the traced pixels are copied from the skyline, the object draws over an identical copy of
itself and is provably invisible — verified at import by differencing the composite with and without
it. Nothing is doubled, nothing is drawn twice, and there is no second mask file to keep in step.

**Why trace rather than ask for an export:** it is derived art, and derived art that a script
regenerates cannot go stale. An exported mask would be exact too, but it would be a second copy of a
shape that already exists in the skyline, and the first time the billboard moved the two would
disagree with nothing to notice. The tracer is pinned to the surface colour and fails loudly if it
stops matching, which is the failure mode worth having.

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

**Pixi owns:** the canvas, layer sprites, the camera transform, the character sprite, hover glow,
the billboard carousel and its perspective mesh, the ticker.

**React owns:** the three overlay panels, routing, focusable navigation, all text content, and the
DOM half of the glitch transition.

**They talk through `lib/store.ts`** and nothing else. Pixi publishes hover state and click intent;
React publishes which overlay is open and whether a transition is running. Neither side queries the
other's internals.

The store has grown past hover state, and the rule it was built on still holds: **anything written
every frame is owned by the ticker, and anything written occasionally goes through the store.** A
route change is occasional — one write. The carousel's dwell timer is occasional. The per-frame
values those produce never touch the store or React at all, because re-rendering the tree sixty
times a second to move one number is the old site's bug wearing a state-management hat.

### The theme

Seven CSS custom properties on `:root`, written by the root layout from `lib/theme.ts`, and mapped
into Tailwind's token space with `@theme inline` so that every generated utility compiles to a
`var(--…)` reference rather than to a literal. That indirection is the whole design: a component
says `text-active`, never `text-cyan-400`, so the palette is swappable without finding and rewriting
anything.

The scene cannot read a CSS variable — it is drawing into a canvas — so `lib/theme.ts` also exposes
the same values as numbers. One definition, two consumers, no second copy to drift.

Colours are named by **role** (`primary`, `active`, `alert`, `ground`, `panel`, `text`, `dim`), not
by hue. Several palettes live in the table and one is selected by `DEFAULT_PALETTE`; changing the
theme is changing that constant.

### The transition layer

The glitch at a route change happens in both mediums at once (`docs/DESIGN.md` § Glitch as the
transition), which makes *who starts it* the only interesting question. The answer is React, because
React is what knows the route changed:

1. The pathname changes. A client component in the layout notices, writes
   `transition: { startedAt, from, to }` to the store, and schedules the clear.
2. React animates its own overlay with Motion — slices, channel split, flash.
3. The scene reads `transition` on the next tick and drives a `GlitchFilter` on the scene root from
   the *same* `startedAt`, so the two stay in phase without talking to each other.
4. The filter is attached when the transition starts and detached when it ends, the same discipline
   the hover glow follows: an attached filter costs a render target every frame it exists, and an
   idle scene should cost nothing.

Neither side waits on the other, and neither animates the other's pixels. That is the whole reason
the clock is a timestamp in a shared store rather than a callback across the boundary.

### Fonts in the canvas

Pixi measures a font at the moment it constructs a `Text`, and never re-measures. A text object built
before its webfont has loaded is laid out in the fallback face and silently stays wrong — the font
arrives, the DOM reflows, and the canvas does not.

So anything drawn in the scene waits on `document.fonts.ready` before it is constructed, and the
fonts are loaded through `next/font` so they are self-hosted and present in the first CSS payload
rather than fetched later from a third party. This is a load-order bug that only shows up on a cold
cache, which is exactly the visit that matters.

### Hotspots: why they are built twice

Hover and clicking are handled by Pixi, using alpha-accurate hit testing against the object art.
This is the right behaviour for irregular painted objects — a rectangle over a desk catches the empty
air above it, and a hover glow that triggers off-object feels broken.

But a Pixi sprite is invisible to the accessibility tree, cannot be tabbed to, and is not a link.
So **every destination also exists as a real `<Link>`** in a nav landmark —
`components/nav/TopNav.tsx`, reading `content/nav.ts`. Both paths dispatch the same navigation.

That nav started out visually hidden, which served assistive technology and nobody else. It is
visible now, because the narrow-viewport framing below made it the only way in on a phone, and
because quick access to a destination should not require finding the object that leads there. It
lists destinations rather than objects — and four rather than three, since Home is not an object in
the room.

This is deliberate duplication, and the alternative was considered and rejected: positioning real DOM
buttons over the art means either rectangular hit areas (wrong feel) or hand-maintained CSS clip
paths per object (unmaintainable as art is redrawn). Keeping interaction in Pixi and access in the
DOM costs one extra list and makes both correct. `components/scene/hotspots.ts` says which object
leads where; `content/nav.ts` is the list of destinations.

### Narrow viewports: swipe instead of follow

The design canvas is 16:9 and a phone is around 9:19.5, so covering the viewport means scaling to the
canvas's *height* and showing roughly a quarter of the room's width. That is arithmetic, not a
choice: scaling down to fit more width leaves the canvas failing to cover the screen.

What changes below `NARROW_WIDTH` (768) is not the layout but the **input**. The transform is the
same cover-and-pan everywhere, minus the 8% overscan, which exists to create pan range at the design
aspect and is not needed on a screen that already has more overflow than it can use. The camera then
opens at `focalCamera()` — the position that puts `FOCAL_POINT` in the middle of the screen — and a
finger drags it from there, across the whole room and no further, because the camera is normalised
to ±1 and the clamp is structural.

That is why the bands still parallax on a phone: parallax is what the camera does, and swiping moves
the camera. The depth is the same depth, driven by a hand instead of by a pointer.

Three things follow from using the camera rather than a second transform: hit testing needs no
separate rule, since it unprojects through the same numbers that drew the frame; the resting
position of "the scene opens here" and of "the pointer left the window, go back" are one concept
(`CameraRig.home`); and crossing the breakpoint, by rotation or resize, re-frames rather than leaving
the camera somewhere that only made sense at the old size.

A press that goes nowhere is a tap, and it hit-tests where it landed — synchronously, because the
click that follows a tap is dispatched before the next frame and reads the hover the frame would
otherwise have set. A press that travels further than `TAP_SLOP` is a swipe and navigates nothing.
The camera stays where the finger left it: no spring back, and no momentum yet — flinging is a
feel decision worth making against real art rather than placeholder lineart.

`visibleSlice()` reports exactly what a given screen sees at a given camera, and `art/TEMPLATE.png`
draws the opening slice for a reference phone, so the composition can be checked against it while it
is being drawn.

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
- `posts.ts` — the blog. **One source feeding two surfaces:** the billboard carousel in the scene
  shows the newest three, and `/updates` lists them all. The billboard must never have its own
  separate copy of this data. A post carries a title, an ISO date and a `target` — the project or
  art piece it is about — and **borrows that thing's picture** rather than having one of its own
  (`docs/CONTENT.md`). The target is also what the feed links to.
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
  must still function as a portfolio. The composite is **generated, not drawn**: `npm run art`
  stacks the same layers and drawn objects in the renderer's own band-then-`z` order and writes
  `site.composite`, so the fallback cannot describe a room the canvas no longer paints. It carries
  no carousel, which is correct rather than missing — the carousel is a Pixi mesh, and without WebGL
  there isn't one. Only mounted when WebGL is absent or the manifest failed, never while assets are
  in flight, so its bytes are off the common path.
- Layer art exported as WebP with a PNG fallback; budget in `docs/ANIMATION.md`.
- **Blur happens at import, not at runtime.** Object glow is a pre-blurred texture, so hovering costs
  one extra quad rather than a multi-pass filter every frame. The two runtime blurs that remain — the
  billboard's glow behind a post image, and the glitch filter — are bounded: the first re-renders
  once per slide into a `RenderTexture`, the second exists only for the ~400 ms of a transition.
- **No permanent filters, and the billboard's headline is why that is worth stating.** Setting it in
  the inverse of the image underneath was tried, using `difference` blending, and Pixi implements
  the advanced blend modes as filters — so it would have been one render target attached for the
  life of the page rather than the life of an effect. It was dropped for a design reason rather than
  that one, but the rule held either way. The headline's colour is now chosen at import from a fixed
  set of neons and arrives as a plain fill (`components/scene/BillboardSurface.tsx`).
- **Blog post images are fetched for the three the carousel shows**, not for the whole archive. The
  rest load with the panel that lists them.
