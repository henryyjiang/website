# `art/` — drop art in here

This is the inbox. Export art from your drawing or animation software straight into the folder
below that matches what it is, and the scene picks it up. You should never have to touch code to
add, replace or reorder a layer.

Nothing here is served to the browser directly. `art/` holds your exports at full quality; the build
converts them into optimised web assets under `public/scene/` and writes a manifest. Replacing a
file here and re-running the import is the whole workflow for changing the scene's look.

```
art/
  background/        Behind the glass — seen through the window
    sky/             Gradient, clouds, haze          → parallax 0.10
    skyline/         City, the skyscraper, billboard  → parallax 0.30
  foreground/        The room itself
    room/            Walls, window frame, furniture   → parallax 1.00
    near/            Foreground clutter that pops     → parallax 1.15
  objects/           The three clickable objects
  character/         The animated character
  reference/         Mood boards, sketches, WIPs. Never shipped, never committed.
```

## How layers work

Each folder is a **parallax band**. Everything in a band moves together at that band's factor; near
things move more than far things, which is what makes the window read as a window. The full model is
in `docs/ARCHITECTURE.md`.

**Order within a band comes from the filename.** Prefix with a two-digit number — low numbers draw
first, so they sit furthest back:

```
art/foreground/room/
  10-back-wall.png
  20-window-frame.png
  30-floor.png
  40-couch.png
```

Gaps of ten leave room to slide something in between later without renaming everything.

## Rules that matter

**Export at the design canvas size: 2560 × 1440.** Every layer is a full-size frame with
transparency where nothing is drawn, not a cropped sprite that has to be positioned. This is what
keeps art and click targets in the same coordinate space — the old site positioned click targets in
viewport percentages over a cropped background, and they slid off the furniture whenever the window
wasn't the aspect ratio the art was drawn for.

**PNG with alpha** for anything with transparency. The build produces the WebP versions.

**The window opening is transparency in the room art.** Draw the room with a hole where the glass
is; the sky and skyline bands show through it. Don't draw the skyline into the room art, and don't
try to mask the skyline to the window shape.

**Give the background bands bleed.** The sky and skyline move less than the room, so they slide
behind the window opening as the camera pans. Draw them wider than the opening needs — roughly 15%
past each edge — or panning will expose their edges.

## `objects/`

The three clickable objects. One file each, full canvas size like everything else, so the object sits
exactly where it belongs with transparency around it.

| File | Is | Opens |
| --- | --- | --- |
| `desk.png` | Desk + computer | Software and AI research |
| `art.png` | A drawing-related object | The drawing portfolio |
| `billboard.png` | The billboard surface on the skyscraper | Recent updates |

Separate files because each needs its own hover glow and its own hit area, tested against the shape
you actually drew rather than a rectangle around it.

`billboard.png` is the odd one: it lives in the **background**, behind the glass, so it parallaxes at
the skyline's 0.30 rather than the room's 1.00. Draw the billboard's frame and lit surface, and leave
the area where text goes clear — the update headlines are rendered live over it from
`content/updates.ts`, not painted in.

## `character/`

See `art/character/README.md`. Short version: drop a frame sequence, a video, or a pre-packed atlas,
whichever your software exports most easily, and the build sorts it out.
