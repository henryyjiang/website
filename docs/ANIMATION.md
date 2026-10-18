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

What this fixes, point by point:

- One texture upload instead of 173 independent decodes. The frames live in GPU memory as a single
  resource, and WebGL texture residency is managed by the driver and the Pixi texture GC, not by
  heuristic eviction of off-screen DOM images.
- `Assets.load` resolves *after* GPU upload, so "ready" actually means ready — unlike `img.complete`.
- `AnimatedSprite` advances on `Ticker` deltas, so playback speed is independent of frame rate.
- Pixi's ticker is stopped on tab hide and started on return, so no catch-up burst is possible.

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
| Character atlas | PNG + JSON manifest | ≤ 1.5 MB total |
| Total initial scene payload | — | ≤ 4 MB |

For scale: the old site shipped 34 MB of character frames alone, plus a 4.4 MB intro video and a
1.9 MB room image.

**Loose frame sequences are never committed.** Working art lives in `art-src/`, which is gitignored;
only packed, web-ready output under `public/scene/` enters the repository. If source frames need to
be versioned, that is a job for Git LFS or a separate art repository, not for this one's history.

## Overlay animation

The three tab panels are DOM, animated with Motion. Different medium, same two rules:

1. Never put a CSS transition on a property that JavaScript writes every frame.
2. Everything is gated behind `prefers-reduced-motion`. Reduced motion means panels appear and
   disappear without travel — not that they become unusable.

Direction for the overlays is "flowy, animated, energetic" and explicitly not retro. Nothing more
specific is decided; see `docs/ROADMAP.md` Phase 4. Do not invent the design ahead of that phase.
