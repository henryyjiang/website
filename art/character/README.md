# `art/character/` — drop the animation in here

Three accepted formats. Use whichever your software exports most easily; the build normalises them
to the same thing. Put it in one subfolder and leave the other two empty.

```
art/character/
  sequence/     PNG frame sequence  ← easiest export from most software
  video/        .mp4 / .webm / .mov
  atlas/        Pre-packed sprite sheet + JSON
```

Whatever the input, the output is a **packed atlas on the GPU**, played by Pixi's ticker. That is not
a stylistic preference — it is the fix for the specific bug that broke the old site. See
`docs/ANIMATION.md` for the postmortem; the summary is that holding ~173 loose decoded PNGs alive is
not something a browser guarantees, it discards them when the tab is backgrounded, and the old code
couldn't detect that it had happened.

## `sequence/` — frame sequence

Just drop the frames in. Any consistent naming with a zero-padded frame number works
(`char_0001.png`, `idle.0001.png`, `Timeline 1_0001.png`); the build sorts numerically, so padding
doesn't need to be uniform.

- **PNG with alpha**, exported at the size the character should appear at in the 2560 × 1440 canvas —
  not the full canvas. Unlike scene layers, the character is a sprite that gets positioned, so export
  it tight with alpha around it.
- **Keep the loop short.** The old animation was 173 frames at 24 fps, about 7 seconds. Most of the
  life in an idle character comes from 1–3 seconds, and a shorter loop costs a fraction of the memory
  and packs into far fewer sheets. Aim for under 60 frames if the motion allows.
- **Make it loop cleanly** — last frame should flow into the first. The build won't fix a visible
  seam.
- Note the **fps** you animated at in `meta.json` below, or the playback speed is a guess.

## `video/` — mp4 / webm / mov

Useful if the animation is long enough that a sequence becomes unwieldy, or if that's simply what
your software gives you.

- **If the character needs transparency, the video must carry real alpha** — ProRes 4444 or
  WebM/VP9 with an alpha channel. A `.mp4` with the character on a flat colour does not count, and
  keying it out automatically produces fringing.
- The build extracts frames and packs them, so a video here is treated as a sequence. It is not
  played back as video.
- Note the fps in `meta.json`.

## `atlas/` — pre-packed

If you already pack sheets (TexturePacker or similar), drop the sheet images and the JSON manifest
here and the build uses them as-is.

- **Max 2048 × 2048 per sheet** — larger fails on some mobile GPUs. Multiple sheets are fine; Pixi
  plays a multi-sheet animation as one.
- Trim transparent padding and let the manifest carry the offsets. Character frames are mostly empty
  space, and trimming often halves the sheet count.

## `meta.json`

Optional but worth it. Drop it alongside the frames:

```json
{
  "fps": 24,
  "anchor": { "x": 1280, "y": 1100 },
  "scale": 1.0
}
```

- `fps` — what you animated at. Defaults to 24.
- `anchor` — where the character's feet sit, in scene coordinates (the 2560 × 1440 canvas). This is
  the one number that's hard to guess from the frames alone.
- `scale` — multiplier if the export came out the wrong size.

## What gets committed

**The frames don't.** `art/character/sequence/` and `art/character/video/` are gitignored, because
committing a frame sequence is what inflated the old repository's history to 100 MB — 72 MB of it
being the same frames committed more than once as they were re-rendered.

**The packed atlas does**, under `public/scene/`. So a clean clone always builds and runs the finished
site; it just can't re-pack the animation without the originals. Keep those backed up somewhere
that isn't this repository.
