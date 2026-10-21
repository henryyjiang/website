# Roadmap

The phase order matters and was set deliberately: build a **rough** skeleton, hand off to art,
then finalize. The point of the early phases is to produce correct seams for swapping art in — not
to look good. Placeholder art that is obviously placeholder is a feature, because it can't quietly
harden into a design decision.

---

## Phase 0 — Infrastructure *(complete, bar one check)*

- [x] Assess the old site and diagnose the animation failure (`docs/ANIMATION.md`)
- [x] Choose the stack: Next.js + React + Pixi.js
- [x] Write project and framework docs
- [x] Point `origin` at `henryyjiang/website`
- [x] Create the `art/` inbox and document the drop-in conventions
- [ ] Confirm the old Vercel integration is disabled
- [x] First commit on the new origin

**Deployment isolation is the gate on everything else.** The old site is live on Vercel through a
Git integration watching `henryyjiang/portfoliosite` on `main`. Nothing in this phase may push to
that remote. See `docs/DEPLOYMENT.md`.

---

## Phase 1 — Scaffold *(complete — 0ab95d9)*

Next app, TypeScript strict, Tailwind, Pixi mounted and rendering. No art yet.

- Next 16 App Router project, `npm run build` green
- `lib/scene-space.ts` — the scene↔screen transform, with the design canvas fixed at 2560×1440
- `SceneCanvas` mounted in the root layout via `next/dynamic` (`ssr: false`), proven to survive
  route navigation without remounting
- Camera: pointer target, exponential damping in the ticker, clamped to available overflow
- Ticker stop/start on `visibilitychange`
- `prefers-reduced-motion` honoured
- Three routes exist (`/desk`, `/art`, `/updates`) with empty panels

**Done when:** solid-colour placeholder rectangles for the four parallax bands pan correctly, the
differential between bands is visibly right, navigating between the three routes doesn't hitch,
and leaving the tab for five minutes and returning changes nothing.

---

## Phase 2 — Rough layout *(complete — the handoff point)*

The layout Henry needs in order to draw against.

- `scripts/import-art.ts` + `npm run art`: walk the `art/` inbox, derive each layer's band from its
  folder and `z` from its filename prefix, optimise to WebP with PNG fallback, and write
  `public/scene/manifest.json`. Pack the character atlas from whichever of the three input formats is
  present. This is the piece that makes art a drop-in operation rather than a code change — build it
  before the placeholder art, not after.
- Four parallax bands wired as data (`sky`, `skyline`, `room`, `near`), read from the manifest
- Placeholder art blocking out: window opening, room interior, skyline with the skyscraper, the
  billboard surface
- Three hotspots positioned in scene space, with hover glow and alpha-accurate hit testing
- Hidden DOM nav mirroring the hotspots, keyboard reachable
- Billboard rendering live text from `content/updates.ts`
- Content modules populated with the real data carried over from the old site

**Done when:** the room is navigable, all three destinations open, and — the real test — replacing a
placeholder file in `art/` and running `npm run art` changes the scene with no code edit at all.

**Verified in a browser, not assumed.** Band offsets matched their expected parallax factors
exactly; a point inside the desk's bounding box but in empty air correctly did *not* hit, proving
the alpha mask rather than a rectangle; hover attached and detached its filter; hit testing was
suppressed under an open panel; the canvas survived navigation across all four routes without
remounting; and dropping a new `15-*.png` into `art/background/skyline/` made it appear in the
scene behind the tower, ordered purely by its filename, with no code touched.

**→ Henry implements the real background, foreground, and object art here**, by exporting into
`art/` per `art/README.md`. If that handoff requires him to touch a component, Phase 2 isn't done.

---

## Phase 3 — Real art integration *(in progress)*

**Landed 2026-10-20: the fully rendered scene.** Sky, skyline, room, desk and bed, all at
2560 × 1440. The skyline is a saturated night city — coral, acid yellow and cyan neon on black, with
painted glow around every lit sign — and the sky now shows through it where the roofline ends, which
retires the opaque-white problem Phase 3 opened with. The room reads pale and flatly lit against it.

That art is now the **colour source for the whole site**, DOM included. See `docs/DESIGN.md`
§ Visual direction for the palette measured out of it.

- [x] Re-run `npm run art` against the delivered files — done 2026-10-20, 3 layers and 3 objects
- [x] Check every layer against the per-layer budget in `docs/ANIMATION.md` — sky 21 KB, skyline
      146 KB, room 48 KB, objects 19–38 KB. **298 KB of WebP for the whole scene**, against a 4 MB
      budget. The PNG fallbacks are far larger (skyline is 1.9 MB) and are only paid by a browser
      with no WebP support, which in practice is none
- [x] Replace the billboard placeholder with the real surface — traced out of `skyline.png` by
      `npm run art:placeholders` rather than hand-drawn. 776 rows, y 230–1005, and the object is
      provably invisible against the art underneath
- [ ] Tune parallax factors against art that has real depth cues
- [ ] Re-check the narrow-viewport opening slice now that the composition is final (`FOCAL_POINT`)

**The bed was painted into `skyline.png`** at exactly the position `objects/bed.png` draws it, which
would have rendered it twice and slid the two copies apart under parallax. Henry re-exported on
2026-10-20 and it is fixed; the billboard surface is whole underneath, measuring
`(141,229) (1393,268) (1393,977) (144,1006)`.

**The billboard is still painted into `skyline.png`, and it stays there.** It needs no export at
all. `npm run art:placeholders` now traces the lit surface out of the skyline and copies those exact
pixels into `art/objects/billboard.png`, which gives the hotspot a hit area, four corners for the
carousel and an unlit screen to show before a post loads. Because the pixels are copied rather than
redrawn, the object draws over an identical copy of itself — differencing the composite with and
without it gives a maximum of 3/255 anywhere, which is WebP noise.

That closes the last art dependency. **Nothing is blocked on Henry any more** except the character
animation, which is Phase 8 and not a ship blocker.

**Done when:** the scene in the browser is the scene in `art/`, nothing is a placeholder but the
billboard and the character, and the parallax differential still reads correctly against art that
has its own depth cues.

---

## Phase 4 — Glow instead of highlight *(complete)*

The hover treatment Phase 2 stood in — a brightness lift — was explicitly a placeholder until the
room's lighting existed. It does now, and it is a city full of painted bloom, against which raising
an object's exposure reads wrong: everything else in the frame *emits*.

So hover emits too, by the same method Henry paints with. Full reasoning in `docs/DESIGN.md`
§ Lighting and glow.

- `npm run art` emits a pre-blurred, saturation-boosted copy of each object's own art as its own
  texture, at a quarter of the canvas — a blur is a low-pass filter, so there is nothing above a
  quarter resolution left to keep, and the GPU's bilinear upscale is itself a blur
- `HotspotGlow` is an additive sprite behind the object with an eased alpha, not a filter
- Glow strength is a `GlowSpec` per hotspot (`hotspots.ts`) — blur, brightness, saturation, alpha
  gain, resting alpha, hover alpha — because it is a decision about what a thing *is*. Furniture
  emits nothing at rest; the billboard sits at 0.7 of full and hovering takes it to 1
- The import also measures each object's four extreme corners into `quad`, which Phase 6 needs

**Verified in the browser, not assumed.** Hovering the desk takes its glow sprite from 0 to 0.9 and
leaves the bed's at 0 and invisible; the billboard rests at 0.7 and hovering lifts it to 1, a 43%
change, with the hit test resolving through the skyline band's parallax. Glow textures are 6–9 KB
each against 150 KB of object art, and no render target is allocated for any of it.

The billboard's strength was tuned twice after it looked wrong, and both failures produced a visible
hard edge rather than a glow — once from `gain` clipping and once from the falloff outrunning the
frame it landed on. Both are written up in `docs/DESIGN.md` § Lighting and glow, because neither is
guessable from the code.

---

## Phase 5 — The cyberpunk pass *(complete)*

The theme, and the transition that carries it.

- Palette as seven roles in `lib/theme.ts`, reaching the DOM as CSS custom properties and the scene
  as numbers. **No component names a colour**, so the whole theme swaps by changing one constant
- **Rajdhani** and Share Tech Mono through `next/font`, self-hosted. Rajdhani is the reference's own
  face — identified off the menu's lowercase, where the single-storey `a` and straight-descender `g`
  settle it
- `TopNav` rebuilt as tabs: flush to the top, butted together, drawn over the panel's upper edge,
  idle dimmed and current in `--active`
- Panel chrome: nearly full-screen, cut corner, hairline rule, scanlines, telemetry marker, and a
  title read from `content/nav.ts` so it cannot disagree with the tab that leads to it
- **The glitch transition**: stepped frames of irregular, mostly-opaque colour bands over black in
  the DOM, and a `GlitchFilter` on the scene root, both driven from one timestamp in the store
- `prefers-reduced-motion` swaps it for a 120 ms crossfade
- `?glitch=N` slows the burst N times in development, because a 320 ms effect cannot be tuned at
  speed — the reference had to be stepped through frame by frame and so does this

**Decided during the pass:** `arasaka` is the palette (compared in the page against four others),
the picker that made that comparison possible is removed rather than shipped, and the skyline stays
at 0.30 parallax — 0.50 was tried and rejected.

**Verified in the browser, not assumed.** A route change attaches exactly one filter to the scene
root, decays its offset from 180 to under 3 across the burst, and detaches it — `root.filters` is
empty before and after. The DOM overlay's band count tracks the envelope (23 → 18 → 12 → 9 → 0) in
the same window and unmounts with it. Four tabs fit a 375px viewport. The production build is clean
and carries no dev indicator.

---

## Phase 6 — The billboard as the blog *(complete — 2026-10-21)*

The content half landed 2026-10-20 and the rendering on 2026-10-21.

- [x] `content/updates.ts` becomes `content/posts.ts`: slug, date, title, body, image by slug
- [x] ~~`art/posts/` inbox~~ — **removed 2026-10-21.** A post borrows the picture of whatever it
      points at instead of carrying one, so there is nothing to export and nothing to keep in step
      (`docs/CONTENT.md` § `posts.ts`)
- [x] `quad` — the object's four measured corners — added to the manifest alongside `bounds` and
      `inner` (`docs/ARCHITECTURE.md` § Objects and surfaces)
- [x] `/updates` becomes the blog listing, labelled **Blog** in the nav — one page, a series of
      posts, no per-post routes
- [x] The saturated variant the carousel projects — `lit`, baked by `npm run art` with saturation
      pushed well past the original, on exactly the images posts point at. Added 2026-10-21 on
      Henry's direction: a photo at its own saturation reads as a picture on a wall rather than a lit
      screen in a neon city (`docs/DESIGN.md` § The billboard)
- [x] The carousel: the newest three posts projected onto the billboard's four measured corners with
      `PerspectiveMesh`, cropped to fill, advancing on a dwell timer. It projects `lit`, not `src`
- [x] The glow behind it is the post's own image, blurred into a `RenderTexture` once per slide —
      drawn over the billboard art and *under* the projected image, so the opaque mesh hides its
      bright middle and only the spill past the screen's edges shows
- [x] The headline over an image is stroked rather than set on a caption bar. A bar along the bottom
      of the screen is what a billboard looks like and it does not survive this room: the bottom
      corners of the billboard are behind the bed (`docs/DESIGN.md` § The billboard)

**Verified in the browser, not assumed.** The mesh is a `PerspectiveMesh` on the manifest's four
corners with its texture frame cropped to the quad's measured 1.682 aspect; the glow render texture
is 357 x 239, bright at the centre, non-zero in the margin and exactly zero at the corners — which
is the property that keeps it from reading as a rectangle drawn around the billboard. Slides advance
on the dwell timer, a post with no target shows its headline on the bare peach surface, and the
scene root still carries no filter while idle.

The image pipeline turned out to be wanted by all three collections, not just the blog, so it was
built once for all of them: `art/projects/` and `art/pieces/` are inboxes, `npm run art` writes
`public/images/` and its own manifest, and `lib/content-images.ts` resolves an entry's image from
its slug. Posts turned out to want no inbox at all — they borrow their target's picture. That also fixed the eight project screenshots, which pointed at `/assets/` —
never a path under `public/` — and had been 404ing silently. `docs/CONTENT.md` § Images.

**Verified, not assumed:** every path the manifest names returns 200 from the dev server; dropping
an unclaimed image into `art/pieces/`, importing, and then adding one entry to `content/art.ts` put
it on `/art` as a `<picture>` with both encodings and its measured dimensions, with no component
edited; the billboard still cycles its headlines from `content/posts.ts`.

**Done when:** the three newest posts cycle on the billboard in correct perspective with their own
colour spilling out behind them, `/updates` lists the same three plus the rest, and neither reads its
data from anywhere but `content/posts.ts`.

---

## Phase 7 — Panel interiors *(in progress)*

Last on purpose, and the last part of the design that was open. Phase 5 settled the frame; Henry
settled what goes in it on 2026-10-21, one shape per tab. Full spec in `docs/DESIGN.md` § Panel
interiors — the short version and the state:

- [x] **Coding** — chronological rows, image left, text box right (title, date, body, links).
      Socials and skills at the top. Every row is a `#project-<slug>` anchor the blog can link into
- [x] **Blog** — the about-me section, moved off Coding and kept brief, at the top; below it the
      posts as condensed news links that point *into* the site
- [x] **Art** — a 3-wide grid of square thumbnails, each opening a popup over the whole page on the
      glitch transition. A piece can be a video
- [x] `Post.target` — a post names the Coding entry or Art piece it is about, checked at import
- [x] Video pieces end to end: `art/pieces/<slug>.mp4` transcoded, poster frame extracted, played
      in the popup
- [x] Posts borrow their target's image rather than carrying one (2026-10-21)
- [x] Video pieces can carry a chosen thumbnail: `<slug>.mp4` plus `<slug>.png` under one slug is a
      pairing rather than a collision, and the automatic frame is the fallback
- [ ] Replace the filler entries with real ones. One per tab is in `content/` to prove the shapes,
      each marked `FILLER`

**Filler, not seed.** Three entries exist only to exercise the layouts and are meant to be deleted:
a post, an art piece drawn from existing scene art, and a video piece standing in with a clip from
`art/reference/` — which is gitignored and must never ship, so that one file is gitignored by name
too (`.gitignore`, and `docs/DESIGN.md` § Visual direction on why the reference is not an asset
source). The eight Coding entries are **not** filler; they are the real projects carried over from
the old site, with their screenshots.

**Done when:** each tab reads correctly with real content in it, the blog's links land on the right
Coding row and open the right Art piece, and no filler entry is left in `content/`.

---

## Phase 8 — Character animation

**Explicitly not a ship blocker.** Henry has yet to animate, and the site goes live without it; the
character arrives as a drop-in afterwards. The runtime half is already built and verified against a
generated placeholder loop (24 frames at 12 fps, tested and deleted,
`manifest.character` is null on `main`).

What this phase owes before launch is not the animation. It is the **proof that the animation cannot
break anything**, and that can be tested now with a placeholder:

- [ ] A placeholder loop positioned to cover part of the bed and part of the desk
- [ ] Clicks on both still land — hit testing reads the object masks and never what is drawn over a
      point (`docs/ANIMATION.md` § The character must never swallow a click)
- [ ] Hover glow on both still reads correctly with the character overlapping
- [ ] The placeholder is deleted again, not committed

Then, when the real animation exists: drop it into `art/character/` in whichever format the software
exports, pack it, and settle the one open question — whether the character's single `z` can serve
both lying in the bed and sitting at the desk, or whether the bed's art has to split.

---

## Phase 9 — Launch

- Lighthouse and real-device passes
- Accessibility audit against the commitments in `docs/DESIGN.md`
- New Vercel project on `henryyjiang/website`
- Move the domain off the old deployment
- Retire the old project (`docs/DEPLOYMENT.md`)

Shippable without Phase 8.

---

## Open questions

Tracked here so they don't get silently decided:

- ~~**Narrow viewports.**~~ Settled in Phase 3: open on a focal slice, swipe to move across the room,
  nav always visible. What is left is art direction — which slice — not architecture.
- ~~**Hover glow treatment.**~~ Settled in Phase 4: a pre-blurred copy of the object's own art,
  additive, eased on hover. Henry's Clip Studio recipe, moved into the build.
- ~~**Which palette.**~~ `arasaka`, settled in Phase 5. Four others stay in `lib/theme.ts` and a
  swap is one constant, so this is reopenable at any time without it being a rebuild.
- ~~**Panel interiors.**~~ Settled 2026-10-21, one shape per tab: Coding is rows of image-plus-text,
  Blog is a brief about section over condensed inward-pointing news links, Art is a 3-wide grid with
  a popup. `docs/DESIGN.md` § Panel interiors.
- ~~**Do blog posts get their own routes?**~~ No. Settled 2026-10-20: the blog is a series of posts
  read in the panel, not a set of individually addressable pages. `slug` stays as the join to a
  post's image, not as a URL.
- ~~**Music.**~~ Cut entirely on 2026-10-20, after being specified and documented. The strip Henry
  drew under the billboard for a now-playing readout stays as painted art with nothing rendered into
  it. If it comes back, the spec was in `docs/AUDIO.md` at commit time.
- **Can one character `z` serve both the bed and the desk?** Depends on the animation. Phase 8.
- **Project dates.** The old markup carried none; they still need reconstructing.
- ~~**Art portfolio shape.**~~ A 3-wide grid of square thumbnails opening a full-page popup, settled
  2026-10-21. Video pieces play in the popup; the grid shows a poster frame pulled from the video.
