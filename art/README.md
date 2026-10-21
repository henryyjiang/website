# `art/` — drop art in here

This is the inbox. Export art from your drawing or animation software straight into the folder
below that matches what it is, and the scene picks it up. You should never have to touch code to
add, replace or reorder a layer.

Nothing here is served to the browser directly. `art/` holds your exports at full quality; the build
converts them into optimised web assets under `public/scene/` (the scene) and `public/images/`
(everything the written content refers to) and writes a manifest for each. Replacing a file here and
re-running the import is the whole workflow for changing how the site looks.

```
art/
  background/        Behind the glass — seen through the window
    sky.png          Gradient, clouds, haze           → parallax 0.10
    skyline.png      City, the skyscraper             → parallax 0.30
  foreground/        The room — walls, window frame, furniture, floor
    foreground.png                                    → parallax 1.00
  objects/           The three clickable objects
    desk.png  bed.png  billboard.png (generated)
  projects/          Project screenshots, one per project, named after its slug
  pieces/            Art portfolio drawings, one per piece, named after its slug
  character/         The animated character
  reference/         Mood boards, sketches, WIPs. Never shipped, never committed.
```

One file per depth, plus the objects and the things drawn onto them.

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

**Fill the whole canvas on the background bands.** The sky and skyline move less than the room, so
they slide across behind the window opening as the camera pans, and a patch of city that only covers
the opening at rest will slide off it. Painting to all four edges of the 2560 × 1440 canvas is
enough — a band at or below 1.00 can never out-travel the overflow that hides it, so nothing has to
be drawn past the canvas. (The `near` band, above 1.00, is the exception and is why
`lib/scene-space.ts` has a `bandBleed`. Nothing is filed there.)

## `objects/`

The three clickable objects. One file each, full canvas size like everything else, so the object sits
exactly where it belongs with transparency around it.

| File | Is | Opens |
| --- | --- | --- |
| `desk.png` | Desk + computer | Software and AI research |
| `bed.png` | The bed | The drawing portfolio |
| `billboard.png` | The billboard's lit surface — **generated, see below** | The blog |

Separate files because each needs its own hover glow and its own hit area, tested against the shape
you actually drew rather than a rectangle around it. The hit area is **measured from the alpha of
the file you drop**, so an object is clickable exactly where you drew it — the rectangles in
`lib/scene-layout.ts` only place the template guides.

These three names are fixed — they are the hotspot ids — but what you draw in them is not. `bed.png`
is the drawing-portfolio object even though the route it opens is `/art`: ids name what is in the
room, routes name the destination. `billboard.png` is the odd one out and you never touch it — see
below.

**Glow is generated, not drawn.** Don't paint a bloom around an object the way you would around a
sign in the skyline. The import makes the glow the same way you would — duplicate, blur, boost the
saturation — and the scene fades it up on hover. Painting one in would double it and it would be
lit even when nothing is hovered. Signs *inside* the skyline art are a different matter: those are
part of the city and should keep their painted glow.

### The billboard: a shape, not a picture

The billboard's **frame, neon bars, lettering and the strip underneath** are painted into
`background/skyline.png` and stay there. Its **screen** is not painted at all any more — Henry took
it out on 2026-10-21, once the carousel was landing on the right four corners — so what is in the
city art at that spot is the inside of the frame, and the thing that fills it is the projected post
image.

`objects/billboard.png` is what remains, and it is now **the only record of where the screen is**.
Nothing draws it. The import measures three things out of it and throws the pixels away:

- the shape you click to open the blog
- the four corners the carousel projects onto
- the inner rect a headline sits in

**Only its alpha matters**, which makes redrawing it easy: if the billboard ever moves, export a
solid fill covering the screen's new position, at the full 2560 × 1440 canvas, any colour you like.
Then `npm run art`. There is nothing to keep in step with it, because nothing else draws that screen.

`npm run art:placeholders` used to generate this file by tracing the peach fill out of the skyline.
It cannot any more — there is no fill to trace — so it warns and leaves the file alone. That is the
intended end state, not a breakage: the tracer existed to avoid drawing the screen twice, and the
screen is now drawn zero times.

**Already fixed, for the record:** the bed was painted into `skyline.png` too, at exactly the
position `objects/bed.png` draws it. That one *did* matter — the bed is a room object at parallax
1.00 while the skyline travels at 0.30, so the two copies would have slid apart as soon as the
camera moved. Re-exported 2026-10-20.

### What the import measures from an object

Everything, from its alpha. There is no config file anywhere holding a rectangle:

- the **hit area**, as a 1-bit mask, so a click lands where you drew and not on the box around it
- the **bounding box**
- the **largest rectangle** that fits inside it, for anything laid out in a box
- the **four corners**, which is what the billboard carousel projects onto — your surface is drawn
  in perspective, with a taller left edge than right, and a post image pasted into an upright
  rectangle inside it would sit flat against art that is not
- a **pre-blurred glow** copy, for the hover effect

**The dark strip under the billboard is not measured and nothing is drawn into it.** It was drawn to
hold a now-playing readout for a music player that has been cut, so it stays as painted art. If
something goes there later, it becomes its own object then.

## `projects/`, `pieces/` — pictures for the writing

These two are not scene art and none of the rules above apply to them. No canvas size, no
transparency, no band, no draw order. They are the pictures that belong to something you wrote:

| Folder | One file per | Named after its slug in |
| --- | --- | --- |
| `projects/` | project | `content/projects.ts` |
| `pieces/` | art portfolio piece | `content/art.ts` |

```
art/projects/
  fwubbo.png
  darwin.png
art/pieces/
  night-window.png
  motion-test.mp4        a video piece
  motion-test.png        and the frame you want shown of it (optional)
```

**There is no `posts/` folder, on purpose.** A blog post is a notice that something already on the
site happened, so it borrows that thing's picture: a post pointing at a project shows the project's
screenshot, one pointing at a piece shows the piece. Nothing to export, nothing to name, and a
screenshot you redraw updates the post about it by itself. `content/posts.ts` § `target`.

**The filename is the whole wiring.** An entry in `content/` names itself with a `slug`; name the
file after that slug and they are joined. Nothing writes a path, so moving or re-exporting an image
never touches code, and the only way to break the join is to disagree about the name — which the
import checks in both directions and says so:

- an entry with no image → warned, and it renders without one. A project is worth listing before
  there is a screenshot of it, and a post shows its headline on the unlit billboard.
- an image no entry claims → warned, and **imported anyway**. That is deliberate: dropping the
  picture in before writing the entry is a normal way to work, and it means adding the entry is all
  it takes to make it appear. It is also the only warning that catches a typo in a filename, which
  otherwise imports perfectly and shows up nowhere.

**Export whatever shape the picture wants.** The import caps the longest side at 1600px and keeps
the aspect it is given — it never crops, because it cannot know what the picture is of. Anything
under the cap is left at its own size rather than blown up. Budget is ≤ 250 KB per image
(`docs/ANIMATION.md`); the import reports any that goes over, and the answer is usually to export at
a sane size rather than at print resolution.

**An image a post points at is the exception that wants a shape**, because the billboard carousel
projects it onto the drawn surface and the mesh crops to fill. Export those full-bleed at roughly
16:9 and at least 1280px wide, and keep anything that matters away from the edges — a tall image
loses its top and bottom. The import also writes a second, hard-saturated copy of exactly those
images for the billboard to project; nothing else sees it.

### Video pieces

`pieces/` takes video as well as stills — `.mp4`, `.webm`, `.mov`, `.m4v` — because the portfolio is
animation as much as drawing. Drop the file in under the entry's slug and `npm run art` transcodes
it to one MP4 every browser plays; the popup plays it, muted until a reader says otherwise.

**A video still needs a thumbnail**, in three places that never play it: the grid's square cell, the
blog feed, and the billboard. One is always produced — a frame from a second in — so an animation
costs you exactly one file. To choose it instead, drop a still beside the video under the same slug
(`motion-test.mp4` + `motion-test.png`) and that wins. Two files of the *same kind* under one slug
is still a collision and still warns.

## `character/`

See `art/character/README.md`. Short version: drop a frame sequence, a video, or a pre-packed atlas,
whichever your software exports most easily, and the build sorts it out.
