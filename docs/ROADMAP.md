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
- [ ] Confirm the old Vercel integration is disabled
- [ ] First commit on the new origin

**Deployment isolation is the gate on everything else.** The old site is live on Vercel through a
Git integration watching `henryyjiang/portfoliosite` on `main`. Nothing in this phase may push to
that remote. See `docs/DEPLOYMENT.md`.

---

## Phase 1 — Scaffold

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

## Phase 2 — Rough layout *(the handoff point)*

The layout Henry needs in order to draw against.

- Four parallax bands wired as data (`sky`, `skyline`, `room`, `near`)
- Placeholder art blocking out: window opening, room interior, skyline with the skyscraper, the
  billboard surface
- Three hotspots positioned in scene space, with hover glow and alpha-accurate hit testing
- Hidden DOM nav mirroring the hotspots, keyboard reachable
- Billboard rendering live text from `content/updates.ts`
- Content modules populated with the real data carried over from the old site

**Done when:** the room is navigable, all three destinations open, and the scene-space coordinates
for every layer and hotspot are documented well enough that redrawn art drops in by replacing files
and adjusting numbers in one table.

**→ Henry implements the real background, foreground, and object art here.**

---

## Phase 3 — Real art integration

- Swap placeholder layers for the real exports
- Tune parallax factors against art that actually has depth cues
- Revisit hover glow with the room's real lighting (`docs/DESIGN.md`)
- Verify the asset budget in `docs/ANIMATION.md`
- Decide the narrow-viewport strategy, now that the composition is known

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

- Character art and frames from Henry
- Pack to an atlas within the constraints in `docs/ANIMATION.md`
- `AnimatedSprite` on the shared ticker
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

- **Narrow viewports.** Orientation-driven pan, tighter crop, or a stacked layout? Needs real art.
  (Phase 3)
- **Tab interior design.** Entirely open. (Phase 4)
- **Hover glow treatment.** Depends on how the room is lit. (Phase 3)
- **Project dates.** The old markup carried none; they need reconstructing. (Phase 2)
- **Art portfolio shape.** No precedent on the old site — grid, reel, or something else. (Phase 4)
- **Character loop length.** Shorter than the old 173 frames; how much shorter depends on the
  animation. (Phase 5)
