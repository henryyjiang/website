# Roadmap

The phase order matters and was set deliberately: build a **rough** skeleton, hand off to art,
then finalize. The point of the early phases is to produce correct seams for swapping art in — not
to look good. Placeholder art that is obviously placeholder is a feature, because it can't quietly
harden into a design decision.

---

## Phase 0 — Infrastructure *(this session)*

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

## Phase 3 — Real art integration

**Landed so far:** Henry's rough lineart for the skyline, the room and all three objects, at
2560 x 1440 with the glass left transparent. The sky is still the only placeholder in the scene,
and it is currently invisible behind an opaque skyline (see below). Positions in the sketch are
provisional — the point of this pass is that they are *marked*, so the character, the overlays and
the hover work can proceed against real geometry.

**Known, and deliberately not fixed yet:** `skyline.png` carries an opaque white fill, so the sky
band composites behind it and never shows. It stops mattering the moment the skyline is coloured
with the sky left transparent above the roofline; nothing in the code needs to change for that.

- Replace the placeholder files in `art/` with the real exports and re-run `npm run art`
- Tune parallax factors against art that actually has depth cues
- Revisit hover glow with the room's real lighting (`docs/DESIGN.md`)
- Verify the asset budget in `docs/ANIMATION.md`
- ~~Decide the narrow-viewport strategy, now that the composition is known~~ — decided and built:
  below 768px the scene opens on `FOCAL_POINT` and is explored by swiping, with the nav visible as
  four buttons (`docs/ARCHITECTURE.md` § Narrow viewports). `FOCAL_POINT` is one constant and the
  template draws the slice it produces, so the opening shot is tunable as the art firms up.

---

## Phase 4 — Tab interiors

Deliberately last. The direction is "less retro, more flowy and energetic" and **nothing more
specific is decided** — do not invent it before this phase.

- Desk panel: projects (timestamped), socials, GitHub, résumé, about
- Art panel: portfolio presentation — grid or reel, probably a lightbox
- Updates panel: full changelog
- Shared overlay chrome, open/close transitions, route-change animation

---

## Phase 5 — Character animation

**The runtime half is built and verified against a placeholder loop** (24 frames at 12 fps,
generated, tested and deleted — it is not in the repo, and `manifest.character` is null on `main`).
Frames are cut from the packed sheets with `orig` and `trim` restored, so trimmed frames sit where
they were drawn; the sprite stands in the `room` band between the layer art and the objects, feet at
the manifest's anchor; and the texture is swapped on the existing ticker rather than through React
or a second ticker. What is left in this phase is Henry's animation and whatever tuning it needs.

Verified in the browser: the loop plays at the manifest's fps with no frame-to-frame jitter despite
13 distinct trim offsets across 24 frames; the tab-hidden path freezes the loop and resumes it
without accumulating elapsed time; the scene survives a forced WebGL context loss and restore with
the animation still running; and client-side navigation across all four routes never remounts the
canvas.

- Character animation from Henry, dropped into `art/character/` in whichever format his software
  exports — sequence, video with alpha, or pre-packed sheet (`art/character/README.md`)
- Pack to an atlas within the constraints in `docs/ANIMATION.md`
- ~~`AnimatedSprite` on the shared ticker~~ — done, see above
- Verify the old bug is gone: long tab-away, memory pressure, multiple backgrounded tabs

---

## Phase 6 — Launch

- Lighthouse and real-device passes
- Accessibility audit against the commitments in `docs/DESIGN.md`
- New Vercel project on `henryyjiang/website`
- Move the domain off the old deployment
- Retire the old project (`docs/DEPLOYMENT.md`)

---

## Open questions

Tracked here so they don't get silently decided:

- ~~**Narrow viewports.**~~ Settled in Phase 3: open on a focal slice, swipe to move across the room,
  nav always visible. What is left is art direction, not architecture — which slice `FOCAL_POINT`
  should open on. Deliberately not done: momentum on release, and device orientation as an input
  (it needs a permission prompt on iOS, it cannot be tested here, and it is motion the reader did
  not ask for — worth revisiting as an enhancement, never as the only way to move).
- **Tab interior design.** Entirely open. (Phase 4)
- **Hover glow treatment.** Depends on how the room is lit. (Phase 3)
- **Project dates.** The old markup carried none; they need reconstructing. (Phase 2)
- **Art portfolio shape.** No precedent on the old site — grid, reel, or something else. (Phase 4)
- **Character loop length.** Shorter than the old 173 frames; how much shorter depends on the
  animation. (Phase 5)
