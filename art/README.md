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
    sky.png          Gradient, clouds, haze           → parallax 0.10
    skyline.png      City, the skyscraper             → parallax 0.30
  foreground/        The room — walls, window frame, furniture, floor
    foreground.png                                    → parallax 1.00
  objects/           The three clickable objects
    desk.png  bed.png  billboard.png
  character/         The animated character
  reference/         Mood boards, sketches, WIPs. Never shipped, never committed.
```

That is the whole inbox at the moment: one file per depth, which is all a rough layout needs.

## How layers work

Every layer belongs to a **parallax band**. Everything in a band moves together at that band's
factor; near things move more than far things, which is what makes the window read as a window. The
full model is in `docs/ARCHITECTURE.md`.

**A layer says which band it is in by its name or by its folder.** Both work, so one file per band
needs no folders at all:

```
art/background/skyline.png          one skyline layer
art/background/skyline-west.png     a second one, same band
art/background/skyline/20-tower.png a whole folder of them, same band
```

The band names are `sky` (0.10), `skyline` (0.30), `room` (1.00) and `near` (1.15). `foreground/` is
the exception: it *is* the room, so anything in it is at 1.00 whatever it is called, and
`art/foreground/near/` is there if you ever want clutter that pops in front of the room. A band
above 1.00 travels further than the overflow that hides it, so art filed in `near/` needs bleed past
the canvas edges.

A file that names no band and sits in no band's folder is **skipped with a warning** rather than
guessed at — a layer at the wrong depth looks nearly right and parallaxes wrong, which is much
harder to spot than a layer that did not show up.

**Order within a band comes from the filename.** Prefix with a two-digit number — low numbers draw
first, so they sit furthest back:

```
art/foreground/
  10-back-wall.png
  20-window-frame.png
  30-floor.png
```

Gaps of ten leave room to slide something in between later without renaming everything. The prefix
is optional: a band holding one layer has nothing to order. Two unprefixed files in the same band
draw in alphabetical order and the import says so, because at that point the order is an accident
rather than a decision.

Objects always draw in front of their band's layer art, whatever the prefixes say.

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
| `bed.png` | The bed | The drawing portfolio |
| `billboard.png` | The billboard surface on the skyscraper | Recent updates |

Separate files because each needs its own hover glow and its own hit area, tested against the shape
you actually drew rather than a rectangle around it. The hit area is **measured from the alpha of
the file you drop**, so an object is clickable exactly where you drew it — the rectangles in
`lib/scene-layout.ts` only place the placeholders and the template guides.

These three filenames are fixed — they are the hotspot ids — but what you draw in them is not.
`bed.png` is the drawing-portfolio object even though the route it opens is `/art`: ids name what is
in the room, routes name the destination.

`billboard.png` is the odd one: it lives in the **background**, behind the glass, so it parallaxes at
the skyline's 0.30 rather than the room's 1.00. Draw the frame and the lit surface and leave it
blank — the update headlines are rendered live over it from `content/updates.ts`, never painted in.
The import measures the largest rectangle that fits inside the surface you drew and the headlines go
there, so moving or reshaping the billboard moves the text with it. Nothing to keep in step by hand.

## `character/`

See `art/character/README.md`. Short version: drop a frame sequence, a video, or a pre-packed atlas,
whichever your software exports most easily, and the build sorts it out.
