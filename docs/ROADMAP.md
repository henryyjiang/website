# Roadmap

The phase order matters and was set deliberately: build a **rough** skeleton, hand off to art,
then finalize. The point of the early phases is to produce correct seams for swapping art in — not
to look good. Placeholder art that is obviously placeholder is a feature, because it can't quietly
harden into a design decision.

---

## Phase 0 — Infrastructure *(complete)*

- [x] Assess the old site and diagnose the animation failure (`docs/ANIMATION.md`)
- [x] Choose the stack: Next.js + React + Pixi.js
- [x] Write project and framework docs
- [x] Point `origin` at `henryyjiang/website`
- [x] Create the `art/` inbox and document the drop-in conventions
- [x] Confirm the old Vercel integration is disabled — done 2026-10-21 at the cutover
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
  emits nothing at rest; the billboard sat at 0.7 of full and hovering took it to 1 (0.6 since
  2026-10-21, for a wider hover gap)
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

**Two faults Henry caught on a larger screen than this was tuned on, both fixed 2026-10-21.** The
projection left a sliver of the peach screen showing along its right edge and sat at a slightly wrong
angle, because `quad` was measured off the 1/8-scale hit mask and every corner was quantised to 8
scene units; it is measured at full resolution now and pushed two units outward so it overhangs the
frame instead of falling short. And the glow was orange whatever was on the screen, because the
billboard's *baked* glow — a blurred copy of the unlit peach surface — was still lit underneath the
carousel's own. They now cross over on the frame clock.

**And the screen came out of the art.** Once the projection was landing on the right corners, Henry
painted the peach panel out of `skyline.png` — there is nothing behind the carousel now but the
inside of the billboard's frame. `art/objects/billboard.png` stays as the record of where the screen
is and is no longer drawn (`components/scene/hotspots.ts` § `drawn`), which also retires the baked
glow that was throwing peach light. Two consequences: the carousel cycles only posts that have a
picture, since there is no unlit surface left to set a headline on, and the billboard object can no
longer be regenerated by `npm run art:placeholders` — if it moves, export a solid fill at the new
position, because only its alpha is read.

**The glow is brightness-normalised per image**, added 2026-10-21 after Henry asked for more of it on
dark posts. Additive blending of a near-black image adds nothing at any opacity, so the lever is the
copy's brightness rather than its alpha: the import measures each `lit` image's luminance and the
carousel multiplies it up to a target, floor 1.4x and ceiling 6x. Three posts whose images differ in
brightness by five times now produce glows within 5% of each other.

**And it reaches further and burns brighter**, on Henry's asks the same day: blur sigma 36 to 64
scene units, then brightness up about half again when the wider halo read as fainter than the tight
one it replaced. The hard line he spotted at the glow's rim was `BlurFilter`'s own padding, which
Pixi derives as twice the strength — two sigma, where a gaussian is still at 8%, so the filter was
clipping its own output square. Both the render texture and the filter padding now come from one
tail length of 3.5 sigma. Pushed brighter again after that, the multiply ran out of room — the blue
channel was already at the ceiling at the screen's edge — so the glow is drawn twice instead:
additive light has no ceiling where colour and alpha both do, and layering adds light without
touching hue.

**Verified in the browser, not assumed.** The mesh is a `PerspectiveMesh` on the manifest's four
corners with its texture frame cropped to the quad's measured 1.682 aspect; the glow render texture
is 357 x 239, bright at the centre, non-zero in the margin and exactly zero at the corners — which
is the property that keeps it from reading as a rectangle drawn around the billboard. With an image
up the baked glow sits at 0.01 and the slide's at 0.70; on a post with no image they swap back. Slides advance
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
- [x] **Art** — a grid of wide 16:9 cards, each opening a popup over the whole page on the glitch
      transition. A piece can be a video. Reshaped from square cells three across on 2026-10-21
- [x] `Post.target` — a post names the Coding entry or Art piece it is about, checked at import
- [x] Video pieces end to end: `art/pieces/<slug>.mp4` transcoded, poster frame extracted, played
      in the popup
- [x] Posts borrow their target's image rather than carrying one (2026-10-21)
- [x] Video pieces can carry a chosen thumbnail: `<slug>.mp4` plus `<slug>.png` under one slug is a
      pairing rather than a collision, and the automatic frame is the fallback
- [x] The Art tab's filler piece replaced by real work: `my-first-animation` (2025-07-09) and
      `current-wip-animation` (2026-10-21), both 2D animations, added 2026-10-21. The first video
      pieces to ship, so the video path is now load-bearing
- [ ] Write the blog post that points at it. The `target` is real; the copy is still a placeholder

**Filler, not seed.** The entries that existed only to exercise the layouts were always meant to be
deleted. The art piece is gone, replaced by real work. One is left — a post — and only its copy is
a placeholder now; it points at a real piece. The eight Coding entries are **not** filler; they are
the real projects carried over from the old site, with their screenshots.

A third — a video piece standing in with a clip from `art/reference/` — was deleted on 2026-10-21,
during the pre-deploy pass. It had proved the video path end to end locally and could never have
shipped: the clip and its derivatives were gitignored by name, but `public/images/manifest.json` is
committed and still named all three files, so **a clean checkout built an Art card that 404'd**
while `npm run build` stayed green. Found by building `git archive HEAD` in an empty directory,
which is the only check that sees what Vercel sees.

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

- [x] A placeholder loop positioned to cover part of the bed and part of the desk — 2026-10-21, a
      procedurally generated bouncing ball, run three ways: sweeping the room, parked on the bed,
      parked on the desk's tabletop
- [x] Clicks on both still land. Not "they did when tried": `hitTest` takes a list of manifest
      objects, a transform and a camera, and there is **no parameter through which anything drawn
      could reach it** — the character cannot affect it because it cannot be passed to it. Checked
      against the real masks at the ball's exact scene position: `(700,1040)` and its edges return
      `bed`, `(2100,755)` and its edges return `desk`, with the ball drawn over both
- [x] Hover glow on both still reads correctly with the character overlapping. Glow is driven by
      the id `hitTest` returns, not by pixels, and the bed lit normally with the ball on it
      (`cursor: pointer`, glow on)
- [x] The placeholder is deleted again, not committed. `manifest.character` is null on `main`

**What the test found.** The loop itself is a non-event: 60 frames of a 2300 × 560 canvas packed to
a single 1916 × 444 sheet at 52 KB, because every frame trims to the ball. Trimming is doing more
work than the doc's "often halves the sheet count" suggests — for sparse art it is the difference
between one sheet and twenty.

**What it found that matters: the `z` knob did not exist**, and now it never needs to. The docs
described draw order as "one number, `z` in the character's meta, defaulting to behind them";
`CharacterMeta` was `{ fps, anchor, scale }` and the character was rendered before the objects,
hardcoded, so lying in the bed could not be authored at all. Henry settled it the same day: the
animations are drawn to sit above the whole scene. So the character became the last child of the
room band, `z` was never added, and the bed's art does not split. Testing the in-front case had
meant moving a JSX block by hand; that block is where it belongs now.

**Also worth knowing before animating:** the desk's mask is 42% solid inside its bounds and
**hollow under the tabletop** — the clickable desk is the top surface, the monitor and the legs.
A character sitting at it will cover mostly empty mask, which is free. The bed is 67% solid and
clickable across its whole top.

Then, when the real animation exists: drop it into `art/character/` in whichever format the software
exports, pack it, and settle the one open question — whether the character's single `z` can serve
both lying in the bed and sitting at the desk, or whether the bed's art has to split.

---

## Phase 9 — Launch *(live — 2026-10-21)*

Done in the pre-deploy pass on 2026-10-21, before the Vercel project exists:

- [x] **A clean-checkout build**, `git archive HEAD` into an empty directory then `npm ci` and
      `npm run build`. Green, and it is what found the 404ing filler card above — building in the
      working tree cannot, because the missing files are sitting on disk
- [x] **The old site deleted from `main`** — `index.html`, `main.js`, `style.css`, `assets/` and the
      duplicate root `resume.pdf`, 3.4 MB, along with the local `archive/old-site` branch
- [x] **A favicon**, which there had never been. Built twice: first as `app/icon.tsx`, a skyline
      drawn from the palette at build time, then replaced the same day when Henry dropped a drawing
      of the character into the repository root. It is `art/icon.png` now and `npm run art` resizes
      it into `app/icon.png` and `app/apple-icon.png` — an inbox slot rather than a hand-placed
      file, because a loose `favicon.png` at the root is what *no obvious place to put it* looks
      like. 101 KB of source becomes 4 KB and 15 KB, and it still reads at 16px
- [x] **The link preview** — `metadataBase`, Open Graph and Twitter cards, and a 1200x630 card
      composited out of the scene art by `npm run art` so it cannot go stale (`lib/scene-space.ts`
      § `CARD_FRAME`)
- [x] **The static fallback is finally the real scene**, which Phase 3 left outstanding: the same
      composite, flattened from the same layers in the renderer's own draw order

Done at the cutover, the same day:

- [x] **The site is live at `henryjiang.vercel.app`**, building from `website` on `main`
- [x] The old Vercel integration disabled — Phase 0's last open box, closed by disconnecting
      `portfoliosite` from the project

Two boxes came off this list by being **moot rather than done**, and the distinction matters if
anyone reads this later. The cutover repointed the *existing* Vercel project at `website` rather
than creating a second one, so there was only ever one project and one URL: the domain never needed
moving, and the old project was not retired because it **is** the project. There is no custom
domain — `henryjiang.vercel.app` is Vercel's project-scoped subdomain, which a second project could
not have served. See `docs/DEPLOYMENT.md` § The cutover, as it actually happened.

Left:

- [ ] Write the one remaining placeholder post (`content/posts.ts`). It is live on the site right
      now and points at a real piece; only its words are stand-ins. The art piece it replaced is
      done — `content/art.ts` is two real animations as of 2026-10-21
- [ ] `MAL_CLIENT_ID` in the project's environment, and `MAL_USERNAME` in `content/about.ts`, if the
      watchlist rows are wanted. Both or neither
- [x] **Accessibility audit against the commitments in `docs/DESIGN.md`**, 2026-10-21. Walked
      keyboard-only, then again with reduced motion forced, then with WebGL refused; contrast
      measured off the rendered page rather than off the palette table. Five of the six
      commitments held. What did not, and what it cost:

      - **Focus was invisible on 30 of the 34 controls on the site.** `clip-path` clips an
        element's `outline` away with everything else outside its border box, and every notched
        control carries one — all four nav tabs, every Close, all eight project links, all four
        feed rows. `getComputedStyle` reported a 2px solid `--primary` ring on each of them and
        nothing was ever drawn. Only the socials rows and the art grid, the one focusable pair
        that is not cut, had a visible ring. Fixed with an inset ring on the notch utilities
        (`app/globals.css`), which is inside the box and so survives the clip. The nav's shape
        moved out of an inline style into `u-notch-b` to be selectable at all.
      - **Reduced motion got a shorter glitch rather than a crossfade.** The DOM half was right —
        `GlitchBurst` draws no bands and cuts 320 ms to 120 ms — but the scene read the same
        `transition` from the store and ran the full 180-unit slice displacement and RGB split
        regardless. `reducedMotion` was in that callback's scope and in its dependency list, and
        used only by the character twenty lines up, which is why it survived review. The scene
        now dips its own alpha and recovers, attaching no filter at all
        (`components/scene/SceneStage.tsx` § `REDUCED_FADE`).
      - **`--dim` was doing two jobs and only one was safe.** It is the reference's idle *menu
        item*, measured off it and deliberately at the edge of legibility (`docs/DESIGN.md`
        § Chrome) — and it had also become the colour of every date, section heading, watchlist
        label and pill control, all of them measured at 2.65:1 against their real background
        against the 4.5:1 § Accessibility promises. Added a `muted` role, each palette's own
        `dim` mixed toward its own `text` until it clears 5.5:1, and repointed the content
        usages. `dim` keeps the nav and the hairlines. Body copy itself was never the problem:
        it measures 14.6:1 and the commitment as written always held.
      - **The home route had no `main` landmark and said nothing at all.** It rendered `null`, so
        a screen reader arriving at the front door found a nav, an `aria-hidden` canvas and
        silence. It now carries an `sr-only` `main` with the site's own three strings from
        `content/site.ts` — the room is still the whole of the visible design.
      - **The art grid's accessible name did not contain its own visible text**, so a voice user
        could not say what they could see (WCAG 2.5.3). The hand-written `aria-label` is gone;
        the name is composed from the cell, and the video badge supplies "video" as real text
        rather than being hidden.

      Verified rather than assumed: the camera is pinned under reduced motion (identical frames
      with the pointer at opposite corners), the carousel holds on the newest post past four
      dwell periods, the popup traps focus and returns it to the opener on Escape, and with
      WebGL refused the site falls back to the static composite with the nav intact. The site
      makes no sound — there is no `audio` element, no `AudioContext` and no `play()` anywhere
      in the source. **The character freeze could not be exercised**: `art/character/` is still
      empty, so `manifest.character` is null and the branch has no frames to hold. That is
      Phase 8, not a gap here.

- [x] **Lighthouse**, 2026-10-21, v13.5 headless, deployed site and then the fixed build.

      | | perf | a11y | best practices | SEO |
      | --- | --- | --- | --- | --- |
      | `henryjiang.vercel.app`, desktop, before | 100 | 98 | 100 | 100 |
      | `henryjiang.vercel.app`, mobile, before | 100 | 98 | 100 | 100 |
      | this build, mobile, after | 98 | **100** | 100 | 100 |

      Mobile after: FCP 0.8 s, LCP 2.3 s, TBT 40 ms, CLS 0, Speed Index 1.9 s. Desktop after is
      100 across the board with TBT 0 ms. The 98 and the 96 seen on another run are LCP noise on
      a 4x-throttled CPU, not a regression — nothing in this pass touched the scene's loading.

      Accessibility was 98 on both deployed passes because of the missing `main` on `/`; it is
      100 on all four routes now. `/art` also failed `label-content-name-mismatch`, which scores
      zero weight and so never showed in the number.

      **One cold-cache outlier worth knowing about before reading too much into a single run:**
      the first deployed desktop pass scored 76 with 560 ms of blocking time. Two further passes
      scored 100 with 0 ms. It is the first-visit cost of compiling Pixi and uploading the
      layers, and it is real for a first-time visitor even though the steady state is clean.

- [x] **Real-device pass — closed on emulation, by decision, 2026-10-21.** Henry's call: good
      enough to ship on. Recorded rather than ticked, because what was done is not what the box
      originally asked for and the difference is worth being able to find later.

      What was done: Lighthouse's mobile preset, a Moto-G-class CPU throttle over slow 4G, plus a
      hands-on pass at 375x812 with touch emulation — the scene opens on the focal slice, swipe
      pans the room, the panels read and the focus ring is visible. Device pixel ratio is capped
      at 2 as `docs/ARCHITECTURE.md` § Performance policy requires: a 375x812 phone at DPR 2 gets
      a 750x1624 backing store and no more.

      What is therefore still unmeasured, in the order it is likely to bite: a real GPU under a
      real thermal budget over a sustained pan; the carousel's per-slide `RenderTexture` blur,
      which is the biggest recurring runtime cost and would show as a hitch every 4.5 seconds;
      the glitch filter's render target on each route change; whether `TAP_SLOP`'s 12px is right
      for a thumb rather than a mouse; and Safari, since every pass here ran on Chromium and
      WebKit is the engine an iPhone will actually use. If any of this ever needs closing
      properly, the cheap way is Vercel Speed Insights — a project toggle, real visitors' devices,
      and it measures INP, which Lighthouse cannot.

- [x] **The nav's idle tabs stay dim. Settled by Henry on 2026-10-21**, the design as drawn.

      They are `--dim` on `--panel/80`, which measures **2.65:1** where WCAG wants 4.5:1 for text
      this size. That was never a slip — `docs/DESIGN.md` § Chrome specifies this exact colour,
      measured off the reference's own idle menu item, and says in as many words that the
      inversion dims everything to near-illegible and that copying it is the point. The audit
      raised it rather than fixing it, and the answer is that the design wins.

      Written down so the next person reading § Chrome against § Accessibility finds a decision
      instead of thinking they have found a bug, and `docs/DESIGN.md` § Accessibility carries the
      same note. Should it ever be reopened: the change is one word, `text-dim` to `text-muted`
      in `components/nav/TopNav.tsx`, which takes the idle labels to 5.56:1 while the borders
      stay `dim` and the inversion survives structurally — the current tab still has a container
      nothing else does. `#99757B` is about the floor at 4.64:1 if dimmer-but-legal is wanted.
      What is *not* available is darkening the ground underneath: `#7E464E` tops out at 2.87:1
      on pure black, so the colour has to move or the exception has to be accepted. It is
      accepted.

      What already softens it, and is why this is a defensible place to land: the current tab is
      `--active` at 14.4:1, hover goes to full `--text`, and focus is now a bright `--primary`
      ring. A visitor can always tell where they are and where they are going. It is the three
      *idle* labels that are dim.
- [ ] `NEXT_PUBLIC_SITE_URL` **only if** a custom domain is ever attached. Until then
      `VERCEL_PROJECT_PRODUCTION_URL` already resolves to `henryjiang.vercel.app`, which is correct,
      so there is nothing to set (`lib/site.ts`)

Shipped without Phase 8, as planned.

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
  Blog is a brief about section over condensed inward-pointing news links, Art is a grid of wide
  cards with a popup. `docs/DESIGN.md` § Panel interiors.
- ~~**Do blog posts get their own routes?**~~ No. Settled 2026-10-20: the blog is a series of posts
  read in the panel, not a set of individually addressable pages. `slug` stays as the join to a
  post's image, not as a URL.
- ~~**Music.**~~ Cut entirely on 2026-10-20, after being specified and documented. The strip Henry
  drew under the billboard for a now-playing readout stays as painted art with nothing rendered into
  it. If it comes back, the spec was in `docs/AUDIO.md` at commit time.
- ~~**Can one character `z` serve both the bed and the desk?**~~ The question is void. Settled
  2026-10-21: the animations are authored to sit above the whole scene, so the character draws over
  the room's objects and there is no `z` to serve anything. The bed's art does not split. The only
  thing that ever draws over the character is the `near` band, which is empty.
- ~~**Does the nav's inversion have to clear WCAG?**~~ No. Settled 2026-10-21, after the
  accessibility audit measured the idle tabs at 2.65:1 against a 4.5:1 requirement. The dimmed
  idle item is the reference's, measured off it, and § Chrome exists to say so — the design wins
  and the exception is accepted knowingly. Everything else the audit found was fixed; this is the
  one thing that was decided instead. Phase 9 carries the numbers and the one-word change that
  would reverse it.
- **Project dates.** The old markup carried none; they still need reconstructing.
- ~~**Art portfolio shape.**~~ A grid of wide 16:9 cards opening a full-page popup, settled
  2026-10-21. Video pieces play in the popup; the grid shows a poster frame pulled from the video.
