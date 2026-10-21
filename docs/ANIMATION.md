# Animation

## Postmortem: why the old character animation broke

The previous site played a 173-frame PNG sequence by preloading 173 separate `<img>` elements and
blitting one per frame to a 2D canvas at 24 fps. Switching away from the tab and back would break
it. Two distinct causes, and the commonly-guessed one is the lesser of them.

**Cause 1 — timing.** `requestAnimationFrame` is throttled to near-zero or paused entirely in a
hidden tab. On return, `timestamp - lastTimestamp` is enormous. The old code carried a `resuming`
flag that reset `lastTimestamp` on `visibilitychange`, which addressed the symptom.

**Cause 2 — decoded-bitmap eviction, which the flag could not fix.** Holding 173 decoded bitmaps
(34 MB of PNGs, far more once decoded to raw RGBA) alive is not something a browser guarantees. Under
memory pressure it discards the decoded data of images that are not currently rendered, keeping only
the encoded bytes. A backgrounded tab is precisely when that happens.

The failure mode is nasty because of the guard:

```js
if (!img || !img.complete) return   // true even after eviction
```

`complete` describes whether the resource *loaded*, not whether the decoded bitmap is still resident.
It stays `true` forever. So the guard passed, `drawImage` was called on an image whose bitmap had to
be re-decoded synchronously, and the sequence stalled, tore or blanked. Hardware acceleration is
adjacent to this — the upload path is involved — but the root cause is holding far more decoded image
data than a browser will keep for you.

**The structural lesson:** do not ask the browser to retain many large decoded images on your behalf
in a `<canvas>` 2D context. Put the frames on the GPU as one texture and they stay there.

## How character animation ships now

**Packed atlas, played by Pixi.** Frames are packed into one or more atlas sheets with a JSON
manifest, loaded via `Assets.load`, and played by an `AnimatedSprite` driven by Pixi's shared
`Ticker`.

The input format is Henry's choice — a PNG sequence, a video with alpha, or a pre-packed sheet, each
with its own subfolder under `art/character/`. `npm run art` normalises all three to the same atlas,
so the pipeline below is identical regardless of what was dropped in. Details and constraints per
format are in `art/character/README.md`.

What this fixes, point by point:

- One texture upload instead of 173 independent decodes. The frames live in GPU memory as a single
  resource, and WebGL texture residency is managed by the driver and the Pixi texture GC, not by
  heuristic eviction of off-screen DOM images.
- `Assets.load` resolves *after* GPU upload, so "ready" actually means ready — unlike `img.complete`.
- `AnimatedSprite` advances on `Ticker` deltas, so playback speed is independent of frame rate.
- Pixi's ticker is stopped on tab hide and started on return, so no catch-up burst is possible.

### The character must never swallow a click

The character stands in the room, between the layer art and the objects, and the actions Henry has
planned put it **on top of the hotspots**: lying in the bed, sitting at the desk. So the two things
to hold are stated here rather than discovered later:

1. **Hit testing is driven by the object masks and nothing else.** It does not consult what is drawn
   over a point, and the character is not a hit candidate. A pointer over the character's elbow where
   the bed is behind it hits the bed, because the bed is what is clickable there. This is already how
   `hitTest` works; the requirement is that it stays that way.
2. **Hover glow belongs to the object, not to the pixels on screen.** The glow sprite sits behind its
   object, so a character drawn in front of the bed is not lit by the bed's glow — the glow lights up
   *behind* him. Now that the character always draws over the room this is the normal case rather
   than an edge one: if an action leaves him substantially covering a hotspot, that is an art
   decision with a visual cost, and the fix is the drawing — never a special case in the hit test.

**The character draws over the room's objects, and there is no `z`.** Settled 2026-10-21: Henry's
animations are authored to sit above the whole scene, so nothing in the room is meant to occlude
the character. That answers the question this section used to leave open — one draw order serves
both sitting at the desk and lying in the bed, and **the bed's art never has to split into a back
and a front piece**, which was the fallback if a single number could not do both. What overlaps
what is decided in the drawing, which is where it belongs.

The renderer is correspondingly simpler: the character is the last child of the room band, and no
meta field controls it. `meta.json` stays `{ fps, anchor, scale }`.

The one place "above the whole scene" is not literally true is the `near` band, which draws after
the room and is currently empty. Art placed there would be deliberately in front of the room plane,
and whether a character belongs in front of *that* is a question for when such art exists. Behind is right for sitting at the desk — the desk occludes the legs and
the character reads as *in* the room. Lying in the bed wants the opposite, and one number cannot be
both; if a single loop has to do both, the bed's art splits into a back and a front piece and the
character goes between. That is a decision for whenever the real animation exists, and it is not a
reason to complicate anything now.

This is testable before Henry draws anything, and was tested that way on 2026-10-21: a generated
bouncing ball, parked on each hotspot in turn and drawn over the top of it, with clicks and glow
checked against the real masks. Both hold, and the stronger statement is structural — `hitTest`
has no parameter through which a drawn sprite could reach it. `docs/ROADMAP.md` Phase 8 records
what the run found, including the missing `z`.

### Required tab-visibility handling

Not optional, and the one piece that must be got right:

```ts
document.addEventListener('visibilitychange', () => {
  if (document.hidden) app.ticker.stop()
  else app.ticker.start()   // deltaTime resets; no accumulated backlog to replay
})
```

Stopping the ticker rather than letting it free-run is what makes the return to the tab seamless. The
old code tried to *correct* for elapsed hidden time; the right move is to not accumulate it.

### Atlas constraints

- **Max 2048 × 2048 per sheet.** Universally supported; larger sheets fail on some mobile GPUs.
- **Multiple sheets are fine.** Pixi handles a multi-sheet atlas as one animation.
- **Trim transparent padding** during packing and let the manifest carry the offsets. Character
  frames are mostly empty space, and trimming often halves the sheet count.
- **Power-of-two dimensions** where convenient, for mipmap and memory friendliness.
- Keep the animation **short and loopable**. 173 frames at 24 fps is ~7 seconds; most of the life in
  an idle character comes from 1–3 seconds plus occasional variation, and a shorter loop costs a
  fraction of the memory.

### Alternatives considered

**WebM with alpha (VP9).** Tiny files, hardware decoded, trivially loopable. Rejected as the primary
path: alpha WebM support is unreliable in Safari, which needs a separate HEVC-with-alpha MP4, so it
means maintaining two encodes and testing two codepaths. Worth revisiting if the character animation
grows long enough that an atlas becomes impractical — a long cutscene-style sequence is the case
where video wins.

**Keeping the loose PNG sequence.** Rejected. It is the original bug, and it was responsible for the
old repository's `.git` reaching 100 MB.

## Asset budget

| Asset | Format | Target |
| --- | --- | --- |
| Layer art (`sky`, `skyline`, `room`, `near`) | WebP, PNG fallback | ≤ 400 KB per layer |
| Object art | WebP, PNG fallback | ≤ 150 KB per object |
| Object glow textures | WebP | ≤ 80 KB per object — they are blurred, so they compress hard |
| Content images (blog, projects, art) | WebP, palette PNG fallback | ≤ 250 KB each, three fetched up front |
| Video pieces (`art/pieces/<slug>.mp4`) | MP4, H.264 | ≤ 6 MB each — **see the exception below** |
| Character atlas | PNG + JSON manifest | ≤ 1.5 MB total |
| Total initial scene payload | — | ≤ 4 MB |

Only the three post images the carousel shows count against that total; the rest load with the panel
that lists them. A budget is about what a first visit costs. **A video piece costs a first visit
nothing**: the Art grid shows a poster frame, and the MP4 is not fetched until a reader opens that
piece's popup. That is why the per-video budget is a separate row rather than part of the 4 MB.

**The video budget is a warning, and both pieces currently exceed it on purpose.** `npm run art`
reports any video over 6 MB and imports it anyway. On 2026-10-21 Henry decided to ship
`my-first-animation` at 15 MB rather than compress it, and the reasoning generalises, so it is
written down here rather than relearned every time the warning appears:

- The piece is thirty seconds of hand-drawn line art at 24fps, densely hatched and moving in every
  frame. That is close to the worst case for H.264 — there is little temporal redundancy and a lot
  of high-frequency detail, which is exactly what costs bits.
- The levers were measured, not guessed. `-tune animation` made it *larger* at the same CRF; CRF 30
  still landed at 9.6 MB; even 1024px wide was 6.8 MB. Nothing reaches 6 MB without going somewhere
  the linework visibly softens, and compared side by side at 1280/CRF 26 it does.
- The thing being damaged is the thing the piece is *of*. A drawing portfolio that compresses away
  its own linework to hit a number has got the trade backwards.

So the rule is: **the budget is the default and the art wins the argument.** A video over it should
be a deliberate, recorded choice about a specific piece, not a thing that drifts. If several pieces
start exceeding it, the answer is a different delivery strategy — multiple renditions, or a real
video host — not a quiet creep upward. `current-wip-animation` sits at 6.2 MB, which is the budget
doing its job: close enough to pass without argument.

The encoder settings in `scripts/import-art.ts` are deliberately uniform and were left alone for
both pieces. Per-piece encoder overrides would be a second source of truth about how a piece looks,
in a pipeline whose whole point is that dropping a file in is the entire workflow.

The content images cap their longest side at 1600px and encode their fallback to a palette PNG,
which the scene's layers do not. The fallback is served to a browser with no WebP support — in
practice none — so what it actually costs is repository weight, and unlike the three scene layers
this is a set that grows with every drawing added to the portfolio. Measured on the eight project
screenshots: 320 KB of WebP against 2.4 MB of full-colour PNG, or 616 KB palette-encoded, which also
brings every fallback inside the 250 KB row above. Scene layers keep full colour because quantising
a flat painted gradient bands visibly once it is composited in WebGL.

For scale: the old site shipped 34 MB of character frames alone, plus a 4.4 MB intro video and a
1.9 MB room image.

**Loose frame sequences are a fine input and never a committed artifact.** Drop them in
`art/character/sequence/` — that folder is gitignored. `npm run art` packs them and only the atlas
under `public/scene/` enters the repository, so a clean clone still builds and runs the site. If the
source frames need versioning, that is a job for Git LFS or a separate art repository, not for this
one's history. See `art/character/README.md` for the accepted input formats.

## Overlay animation

The three tab panels are DOM, animated with Motion. Different medium, same two rules:

1. Never put a CSS transition on a property that JavaScript writes every frame.
2. Everything is gated behind `prefers-reduced-motion`. Reduced motion means panels appear and
   disappear without travel — not that they become unusable.

Direction for the overlays is "flowy, animated, energetic", now in a **cyberpunk register** with a
glitch as the signature route transition — see `docs/DESIGN.md` § Glitch as the transition for its
anatomy and `docs/ARCHITECTURE.md` § The transition layer for who drives it. That settles the
*frame*: how a panel arrives and what it is made of. How a project list, an art portfolio or a blog
post reads **inside** a panel is still undecided and still Phase 4.

Two things the glitch does not get to break:

- **It is bounded.** The filter attaches when the transition starts and detaches when it ends. A
  glitch filter left attached costs a render target on every frame of an otherwise idle scene.
- **It is not a CSS transition.** The DOM half is driven by Motion writing transforms directly, and
  the scene half runs in the ticker from a shared timestamp. The first rule on this page applies to
  it exactly as it applies to the camera: nothing that JavaScript writes per frame may also carry a
  CSS `transition`.
