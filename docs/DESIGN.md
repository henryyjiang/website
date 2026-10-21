# Design brief

## The scene

An apartment room with **floor-to-ceiling windows**. Through the glass, a city skyline; dominating
it, a large skyscraper carrying a **giant billboard**. The room is the interior foreground, the city
is the background, and the parallax between them is the effect the whole layout is built around.

The camera pans with the mouse within the room. The character is animated and composited over the
scene.

### Carried over from the old site, deliberately

- Mouse-driven panning around the scene
- The room as navigation — objects are the buttons
- An animated character on top of the scene

### New

- The window, and therefore a true background/foreground split with parallax
- Navigation condensed from eight hotspots to three
- A billboard in the background as a live surface, not decoration

## The three hotspots

| Hotspot | Object | Leads to |
| --- | --- | --- |
| **Desk** | Desk + computer | Software and AI research: socials, GitHub, résumé, about me, timestamped project list |
| **Art** | A drawing-related object | Portfolio of drawing and animation work |
| **Billboard** | Skyscraper billboard, in the background through the window | Carousel of the three newest blog posts; opens the blog |

Three is a deliberate reduction from the old site's eight (beanbag, desk, bookshelf, speaker,
skateboard, LinkedIn, GitHub, résumé). Those scattered one destination per object; these group by
domain, and the things that used to be their own hotspots — socials, GitHub, résumé, about — become
content inside the desk panel.

**The billboard is the interesting one.** It is the only hotspot in the background band, which means
it sits behind the glass and parallaxes differently from the room objects. That is a feature: it
reads as genuinely far away, and it gives the skyline a reason to be looked at. It also means its
hit area moves at the `skyline` parallax factor rather than the `room` factor, so hit testing must
go through the same scene transform as everything else rather than assuming a single plane.

The carousel on the billboard surface and the `/updates` page are **two views of one data source**:
the billboard shows the newest three posts, image and headline; the route lists them all. Neither
holds its own copy. See `docs/CONTENT.md` § `posts.ts`.

The nav calls that destination **Blog**, because that is what it is to a reader. The route keeps its
original `/updates` name so links already shared keep working, and the hotspot keeps the id
`billboard` because ids name what is in the room. Three names for one thing, each of them the right
name in its own place — `content/nav.ts` explains the split.

## Visual direction

**Cyberpunk, and specifically the register of CD Projekt Red's *Cyberpunk 2077* — its loading
screen most of all.** Near-black grounds, two or three saturated neons used at full strength, hard
angular edges with clipped corners, condensed technical type, and glitch as the transition between
states rather than a fade.

This is a sharpening of "flowy and energetic", not a reversal of it. What is still being avoided is
**retro**: pixel textures, CRT scanline nostalgia, VHS warble, the hard-edged 90s-web panels the old
site had. A Cyberpunk 2077 glitch is a different thing from a retro glitch — it is clean, digital
and high-contrast, it reads as a signal dropping out rather than as a tape wearing through. The old
site's `glitch.mp4` intro stays dropped; that was a retro device, and a four-megabyte video besides.

The reference is a **style register, not an asset source**. No CDPR logotype, no game screenshots, no
ripped UI art. Everything shipped is Henry's drawing or generated from it.

Henry supplied two clips — a menu screen and a scene transition — which live in `art/reference/`.
That folder is gitignored and never ships, so **the measurements taken off them are written into
this document rather than left in the files**: a later session will not have the videos, and
"look at the reference" is not a specification.

### The palette is a table, and one row is in use

Every colour the site uses is a **role** — `primary`, `active`, `alert`, `ground`, `panel`, `text`,
`dim` — defined once in `lib/theme.ts` and reaching the DOM as CSS custom properties and the scene
as numbers. No component names a colour, which is the point: swapping the whole theme is editing
`DEFAULT_PALETTE`, and nothing else moves.

**`arasaka` is the one in use**, settled 2026-10-20 after comparing them in the page. It is the
reference's own set, which reads harder against Henry's scene than the softer hues measured out of
the skyline:

| Role | `arasaka` | Used for |
| --- | --- | --- |
| `primary` | `#F9F31A` | Brand accent, focus rings, rules |
| `active` | `#66F6F2` | The current tab, links, hover, headings |
| `alert` | `#FF003C` | Emphasis, the glitch, destructive affordances |
| `text` | `#D8E4E8` | Body copy |
| `dim` | `#7E464E` | Idle and secondary text |
| `panel` | `#0E1118` | Panel and tab fill |
| `ground` | `#080E14` | Page ground |

`signal` — `#FFFF67`, `#67FFFF`, `#FF7F67`, measured out of `art/background/skyline.png` — is kept
in the table because it is where the three-role structure came from, and because those are the hues
actually painted in the scene. Three more (`sodium`, `chlorine`, `monowire`) are there to be tried.

**The three neons in `signal` share a structure** worth noticing: each is two channels at `FF` and
one at `67`. A new palette built the same way will sit in the family; one sampled off a screenshot
will not.

Roles follow the reference's structure — yellow is the primary action colour, cyan is the
informational one, red is the alarm — because that structure is what makes the reference legible at
a glance.

Contrast is non-negotiable even here, and the good news is that neon on near-black is enormous. What
fails is neon on neon, and anything light on a lit surface: body text is `--text` on a dark ground,
`--ground` on a lit one (which is why the billboard's headline is near-black), and neons are for
accents, rules, and type at display sizes.

### Typography

Two families, both condensed-technical, loaded through `next/font` so they are self-hosted and
subset rather than fetched from a third party:

- **Display / UI** — **Rajdhani**, which is the face in the reference: the single-storey `a`, the
  straight-descender `g` and the flat-sided squarish curves are its signature, and the lowercase in
  the menu's account line settles it. Used for nav, headings, body and the billboard.
- **Mono / telemetry** — a technical monospace for dates, tags and anything that should read as a
  readout (Share Tech Mono or JetBrains Mono).

Body copy stays at a comfortable size and weight, and in sentence case. The reference uses display
type everywhere because it has almost no prose; this site has paragraphs, and setting a project
description in condensed uppercase would be a costume rather than a design. Uppercase with wide
tracking is for labels, tabs and headings only.

Rajdhani is a condensed interface face, not a reading face. It holds up at the lengths this site
actually has — a project blurb, a changelog entry — and if a blog post ever runs long enough to feel
tiring, that is a Phase 7 problem and the answer is a second family for body copy, not a different
theme.

**Canvas text has a loading order problem the DOM does not.** Pixi measures a font when it creates
the text object, so a `Text` built before the webfont arrives is laid out in the fallback and never
re-measured. Anything drawn in the scene waits on `document.fonts.ready` before it is constructed —
see `docs/ARCHITECTURE.md` § Fonts in the canvas.

## Glitch as the transition

Route changes glitch. It is the site's one signature transition and it replaces the fade that would
otherwise be there.

### What the reference actually does

Read frame by frame out of `art/reference/transition effect.mp4` (30 fps), because playback hides
the structure and a glitch is four frames of structure:

| Frames | |
| --- | --- |
| 1–2 | **Onset.** The source image survives, cut into a few thick horizontal slices shoved sideways by different amounts. Black gaps open where content slid away. A handful of thin coloured lines appear. |
| 3–12 | **Peak.** The image is almost entirely gone. The frame is horizontal bands of *saturated colour* — pure red, hot magenta, electric blue, cyan, green — over large areas of **pure black**. Band heights vary wildly, from 2px hairlines to 60px blocks. Colour smears rightward from each band's origin, and a vertical seam runs down the frame where the block columns change phase. |
| 13–16 | **Recovery.** The destination comes back carrying residual slices, which resolve in one step rather than easing out. |

Two things that are easy to get wrong and that the reference is unambiguous about:

- **It is not an RGB split.** A channel offset gives you red and cyan ghosts of a recognisable
  image. This replaces the image with colour. The saturation is far beyond anything in the source
  frame, and black is doing at least as much work as colour — at the peak, most of the frame is
  black.
- **The bands are irregular.** Not a uniform strip height, not evenly spaced. A few thick ones among
  many thin ones is what reads as corruption rather than as a venetian blind.

The clip is a *cutscene* cut, so it runs burst → black hold → burst over about two seconds. A route
change gets **one burst, around 300 ms**, front-loaded: worst distortion in the first 80 ms, the
rest recovery. Long enough to register, short enough that it never stands between a reader and the
thing they clicked.

### Where it happens

In **two places at once**, which is the part worth getting right: the DOM overlay glitches *and* the
scene behind it glitches, in the same window, so the effect reads as the whole display dropping out
rather than as a panel animating over a calm room. They are driven from one clock —
`docs/ARCHITECTURE.md` § The transition layer.

`pixi-filters`' `GlitchFilter` gets the slice displacement and the channel offsets, which is perhaps
half of it. The saturated colour bands and the black-out need a pass of their own: quantise `y` into
irregular bands, displace and sample-and-hold each one horizontally, push its channels to full
saturation, and knock a proportion of them to black. That is a short fragment shader, and it is the
difference between "a glitch" and *this* glitch.

**Reduced motion replaces it with a 120 ms crossfade.** No displacement, no flash, no colour
banding. The transition is decoration; the navigation is the function.

Glitch is used **only** for route changes. Not on hover, not on load, not idling in the background.
A glitch that happens constantly is a texture, and it stops meaning "something changed".

## Lighting and glow

Hover feedback on the old site was a stacked `filter: drop-shadow` in blue, applied to the whole
layer. It read as a UI effect pasted onto the art rather than light in the room. Phase 2 stood in a
brightness lift instead and deliberately deferred the real treatment until the art existed. It does
now, and the art decides it.

**The city is painted with glow already.** Every lit sign in `skyline.png` has a soft coloured bloom
around it, made the way Henry makes them in Clip Studio: duplicate the layer, drop the copy
underneath, gaussian blur it. A brightness lift on hover does not belong in that scene — it changes
an object's exposure, while everything else around it emits.

**So hover emits.** The same recipe, moved into the pipeline: for each object, the build produces a
pre-blurred, saturation-boosted copy of that object's own art. At runtime it is a sprite sitting
behind the object with additive blending, and hovering eases its alpha up from zero. Because the
glow texture is the object's own pixels, it is the object's own colours — a warm desk glows warm, the
bed's grey-blue glows cool — with nothing to keep in step by hand.

Doing the blur at **import** rather than as a runtime filter is the whole trick. A `BlurFilter` on
hover costs a render target and several passes every frame something is hovered; a pre-blurred sprite
costs one more quad. It is also, exactly, what Henry already does by hand, which is why it looks like
the rest of the painting.

**How strongly a thing emits is per object**, in `components/scene/hotspots.ts` beside its band and
its route, because it is a statement about what the thing *is*. A bedside table and a floodlit
billboard the size of a building should not share a constant. Furniture emits nothing until pointed
at; the billboard sits at 0.6 of full and hovering takes it to 1. That gap is the whole hover
affordance and alpha stops at 1, so widening it means lowering the resting level rather than raising
the hovered one — which the brightness-normalised carousel glow left room for, since the screen now
reads as lit well below where it used to have to sit (§ The billboard).

**The counter-intuitive part is `gain`.** Blurring spreads a fixed amount of opacity over a much
larger area, so raising `blur` on its own buys reach by making the halo fainter everywhere — turning
it up makes a glow *weaker*. The intensity has to be put back afterwards by re-amplifying alpha
across the widened area. Reach and strength are two knobs, and the one that looks like strength is
not.

There are two more traps in the same place, both found by making them.

**Brightness clips.** The billboard's surface is nearly white already, so lifting brightness much
above 1.2 maxes every channel and the glow comes out colourless. Strength belongs in `gain`, which
does not touch hue.

**`gain` has to be a curve, not a multiplier.** `alpha * gain` clips too: everything above
`1 / gain` lands on fully opaque, so most of the halo goes perfectly flat and the radius where the
clipping stops becomes a hard ring — it reads as an outline drawn around the object rather than as
light coming off it. `1 - (1 - alpha)^gain` approaches opaque without reaching it, lifts the faint
outer falloff hard, barely touches the bright core, and stays smooth everywhere.

**And the falloff has to be shorter than whatever it lands on.** The billboard sits in a black frame
about 90 scene units wide. A glow whose falloff is longer than that lights the entire frame evenly,
which turns the frame into a flat lit band with a hard edge where it meets the city — the same
"outline" failure arriving by a different route, and the one that is easiest to mistake for a
rendering bug. The falloff has to finish inside the band. That is why the billboard's `blur` is 14
and not the 26 that reaches further: reach is worth nothing if it arrives as a rectangle.

**A blur has two edges, and the second one is the filter's own.** This cost two rounds to find, so
it is worth writing down plainly: `BlurFilter` sets its `padding` to **twice** the strength, and at
two sigma a gaussian is still at 8% of full. The filter therefore clips its own output to zero while
it is plainly visible — a hard line, in a ring around the glow, at exactly `2 x strength` from the
edge of the thing being blurred. It is the same symptom as the two traps above and a completely
different cause, which is what made it confusing: alpha stepped 0 → 21 in one pixel. The render
texture has to be big enough *and* the filter has to be told to use it, so both are derived from one
tail length of 3.5 sigma, where a gaussian is at 0.02% and rounds to nothing in eight bits.

**All three of those are about a *baked* glow, and the carousel's is not one.** Worth stating
because the two look like the same effect and obey opposite rules. A baked glow blurs a
*silhouette* and then re-amplifies its alpha with a gain curve, so it has a fixed amount of opacity
to spend: spreading it further makes it fainter everywhere, and the gain that puts the strength back
is what clips into a hard ring. The carousel's glow blurs a large *filled rectangle* with no gain
curve at all, so its middle stays saturated however far the edges smear, and widening it makes the
surroundings brighter rather than dimmer — going from sigma 36 to sigma 64 takes the light landing 90
units out from 0.6% of full to 16.5%. There is only one rule it shares: the render texture has to be
big enough for the falloff to reach nothing before the edge, because a gaussian that runs out of room
is cut off square. That is why its margin is derived from its blur (three sigma) rather than picked.

Three consequences worth stating:

- **Glow is never the only affordance.** The cursor changes, the DOM nav exposes every destination,
  and focus is visible. Someone who cannot see the bloom loses nothing they need.
- **Glow colour is measured, never typed.** It comes out of the art. If an object is redrawn in a
  new colour the glow follows on the next `npm run art`.
- **The billboard is lit all the time**, not only on hover — it is a screen. Its hover state is a
  lift in that standing glow, not the arrival of one.

## The billboard

It is the blog, and it behaves like a screen in the city rather than a panel in the UI.

**The surface is a perspective quad, not a rectangle.** Henry drew it in perspective: the left edge
is taller than the right, and the top and bottom edges slope. A post image pasted into an
axis-aligned rectangle inside that quad would sit visibly flat against art that is not. The three
most recent posts are projected onto the four measured corners, cropped to fill, and advance on a
dwell timer.

**The image is the one belonging to whatever the post points at** — a project screenshot, a drawing,
a video's thumbnail. A post has no picture of its own (`docs/CONTENT.md` § `posts.ts`), which means
the billboard is showing the same image the Coding row or the Art grid shows, saturated.

**The glow behind it is the post's own image**, blurred and boosted the same way the hover glow is —
Henry's Clip Studio recipe again, but on content that changes, so this one is rendered once per slide
rather than baked at import.

**Every post throws about the same amount of light, whatever it is a picture of.**
This is the part that is not obvious, and it is where the first version was wrong.
The glow is composited *additively*, so adding a near-black image adds nothing at any
opacity — a post whose picture is a dark screenshot did not light the city at all, and
no amount of alpha could make it, because there was nothing there to be more of. The
fix is to brighten the copy before blurring it, and how far to brighten is a question
about the particular image: `npm run art` measures each one's average luminance into
`lit.luma`, and the carousel multiplies it up to a target. A neon drawing is already
there and gets the floor; a mostly-black screenshot gets up to six times. The result
is a billboard whose backlight does not dim because the picture is dark, which is what
a screen does.

Measured across the three filler posts, whose images differ in brightness by a factor
of five: the glow textures come out at mean luminance 67, 65 and 64.

**How far it reaches is a separate knob from how bright it is**, and on 2026-10-21 Henry
asked for more of both in turn. The blur sigma went from 36 scene units to 64, which
roughly doubles the reach. That turned out to read as *less* glow rather than more —
the same light spread over a larger area is thinner everywhere you look, even though
the value at any given distance went up — so the brightness went up with it by about
half again, and the saturation with that, because a bigger multiply clips more pixels
and clipping is what turns coloured light grey.

**Past a point, brightness stops being the lever and layering starts.** Pushed once
more, the per-image multiply ran out: light added to the frame is the texture's colour
times its alpha times the sprite's, and at the screen's edge the blue channel of a
blue image was already landing at 74 of a possible 78. Turning the gain up bought
nothing in blue and only lifted red and green, which is precisely how a colour washes
out to white. Alpha could not help either — it stops at 1, and the resting level is
held at 0.6 on purpose so that hovering has somewhere to go.

Additive light has no ceiling, so the glow is **drawn twice**. Two quads of one
texture add twice the light with the hue untouched, which is the one thing a multiply
cannot do, and the second costs a quad of a texture that is already uploaded. The
stack sits in a container whose alpha the ticker drives, so the resting and hovered
levels keep their ratio: 0.6 and 1 become an effective 1.2 and 2.

The skirt that results, as light actually added to the frame at rest, for a blue
image: 30/84/148 at the screen's edge, 20/56/98 at 40 units out, 10/26/47 at 90,
1/7/12 at 140, nothing by 190 — with saturation at 0.79 all the way out, identical to
what it was at half the brightness. That is the test of whether the lever was the
right one.

Two bounds matter. The lift is a multiply, so it rescues dark pixels and clips bright
ones; past a point an image stops being brightened and starts being flattened into a
white rectangle, which is a worse failure than the one being fixed. And saturation
goes on *after* the lift, because lifting takes colour out and the whole point is
coloured light — grey light reads as a lamp behind the billboard rather than the
billboard being on.

**And it is the only light the billboard throws.** Every object gets a pre-blurred copy of its own
art at import (§ Lighting and glow), which for the billboard was a copy of the *unlit* peach screen —
so while that glow was lit underneath a projected image, the building threw peach light into the city
whatever was on the screen, which is the one thing a working screen never does. It was the first
thing Henry noticed about the finished carousel. Now that the object is not drawn, its baked glow is
not either, and the slide's own glow carries the billboard's `GlowSpec` — 0.7 at rest, 1 when pointed
at. It still fades with the slide, because there is a moment on load before an image is up, and the
city should not be lit by one that is not there.

The resting level came down from 0.7 to 0.6 on 2026-10-21, which is the same decision read from the
other end: a brighter texture needs less opacity to look lit, and the opacity it gives back is
hover range.

**And the image is saturated hard before it is projected** — settled 2026-10-21. A photograph or a
screenshot pasted onto the billboard at its own saturation reads as a picture hung on a wall, not as
a lit screen in a neon city, and it sits wrong against a skyline painted entirely in full-strength
coral, acid yellow and cyan. So the import writes a second encoding of every post image with
saturation pushed well past the original and a slight brightness lift, and the carousel projects
that one; the panel keeps the unmodified image, because the blog is a document and not a billboard.

Baked at import rather than filtered at runtime, for the reason in `CLAUDE.md`: a `ColorMatrixFilter`
on the mesh costs a render target for as long as the carousel exists, which is always. (The glow does
use one, and that is not a contradiction — it runs once per slide into a texture, not once per frame
onto the screen.)

**What the saturation knob actually buys is less than it says**, which is worth knowing before
turning it up again. `BILLBOARD_LOOK` multiplies saturation by 1.9, and the measured change across
the four images posts point at is 1.13x to 1.37x. Two reasons, both inherent: a pixel that is already
near-saturated clips at full, and a pixel that is nearly grey has almost nothing to multiply. The
neon drawing goes 0.64 to 0.81; the near-greyscale quant screenshot goes 0.022 to 0.028 and always
will, because saturation cannot invent a hue that was never there. For an image like that, the thing
that makes it read as a lit screen is the glow's brightness lift, not its saturation. The knobs are
in `scripts/import-art.ts` (`BILLBOARD_LOOK`), and the variant is written as `lit` on exactly the
images posts point at — baking one for every screenshot in the repository would double a cost
nothing pays.

### The headline is not on a bar, and that is the room's doing

The obvious way to put a title over a photograph is a dark bar along the bottom of the screen with
light type on it, which is what a billboard looks like. It was built that way first and it does not
survive this composition: **the bottom corners of the billboard are behind the bed.** The screen is
outside the window and the furniture is in front of the glass, so a caption bar there is half eaten
by a duvet. The top edge is no safer — the window frame crosses it.

So the headline stays centred on the surface, where it has always been and where it is demonstrably
clear of the room, and carries its own ground with it as a heavy near-black outline. It also leaves
the image unobscured, which a bar across the middle would not. Near-black type on the bare peach
surface is unchanged: the billboard is the one place on the site where the ground can be either, so
it is the one place the pairing is chosen at runtime rather than settled in the theme.

This is worth remembering before moving anything on that surface: **what is visible on the billboard
is decided by the room in front of it, not by the billboard's own art.** The measured quad says
where the screen is, not where it can be seen.

**The dark strip under it stays as painted art** — a bar with a cyan bracket at one end and a yellow
one at the other. It was drawn to hold a now-playing readout for a music player that has since been
cut, so nothing is rendered into it. It still works as part of the billboard's furniture, and the
option to put something there later is open.

The surface is **measured, never typed**: `art/objects/billboard.png` says where the screen is and
the carousel projects onto its four measured corners. Redrawing the billboard moves the carousel with
it and takes no code — `docs/ARCHITECTURE.md` § Objects and surfaces.

**The screen itself is no longer painted.** Henry removed the peach panel from `skyline.png` on
2026-10-21, once the projection was landing on the right four corners, and the object is not drawn
either — so what is behind the carousel is the inside of the frame. Two things follow. The billboard
has no unlit state to fall back on, so **the carousel cycles only posts that have a picture**; a post
with nothing to project is still in the blog and simply has nothing to say up there. And the
headline always sets light-on-dark with its outline, because there is no pale panel left for
near-black type to sit on.

## Chrome

### What the reference does

From `art/reference/cyberpunk menu screen.mp4`, measured off the main menu:

| | |
| --- | --- |
| Ground | `#080E14` — near-black with a faint warm cast, not neutral grey |
| Idle menu item | `#7E464E` — a **dimmed** maroon-red. Plain text, no container |
| Active item | `#66F6F2` cyan text in a **1px cyan outline with no fill**, bottom-right corner clipped at 45° |
| Brand | `#F9F31A` yellow, with a cyan ghost offset a few pixels and a couple of glitch slices through it |
| Rules | Hairline, dim, with a label set inline in the rule rather than above it |
| Texture | Fine horizontal scanlines over the panel background at very low opacity |

**The inversion is the thing to copy.** A normal web nav renders every item at full strength and
marks the current one. This dims everything to near-illegible and gives the active item all the
contrast, plus a container nothing else has. It makes a list of five items read as one live item and
four dormant ones, which is exactly what a nav is.

Its decorations are *technical*, not ornamental — a clipped corner, a small glyph box, a part number
(`PROTOCOL 4520-A44`) at the end of the active row. They imply a machine with more going on than it
is showing.

**On scanlines:** the reference has them and "away from retro" does not forbid them. The retro
version is a CRT — curvature, bloom, a vignette, visible phosphor. This is a 1px line at a few
percent opacity that reads as a display surface. Subtlety is the whole difference, so keep them
under 5% and never animate them.

### What this site does with it

**The nav is tabs, flush to the top, overlapping the panel.** Four destinations butted against each
other with no gap, cut at the bottom corners, sitting at `top: 0` and drawn *over* the panel's upper
edge rather than floating above it. That is the whole reason they read as attached to the page below
rather than as a separate widget hovering in front of it. They take the inversion: idle tabs dimmed,
the current one in `--active` with a container nothing else has.

**The panel is nearly the whole screen** — everything bar a hairline margin. A blog post is an image
and a body of text at once, and a centred column three-quarters of the way up the viewport cannot
hold both without cramping one. The header's top padding is what keeps the title clear of the tabs;
it is the one measurement that has to agree with the nav's height.

**It clears the tabs by about ten pixels, and no more.** Tightened 2026-10-21, twice. The padding
was set to float the title comfortably under the nav and ended up leaving forty-odd pixels of
nothing above every headline — the first thing a reader met on each of the three tabs was empty
panel. A headline sitting just under the tabs reads as the top of the thing they are attached to,
which is what they are.

It is **one value at both sizes**, where the rest of the frame takes a breakpoint. The two things it
has to clear move in opposite directions: the panel's own margin grows from 8px to 12px while the
nav grows by 4px with its label. They cancel, so a single 48px lands about ten pixels under the tabs
on a phone and on a desktop alike, and a `sm:` variant here would only be describing a difference
that is not there.

**The panel's title is the nav's label**, read from `content/nav.ts` rather than typed into the
page. They name the same destination, so a page that carried its own title could disagree with the
tab that leads to it — and did, briefly: the tab said "Coding" while the panel said "Desk".

## Panel interiors

Settled 2026-10-21, after the frame was. **Each tab is arranged differently on purpose.** The three
work areas are peers, but they are not the same kind of thing to read: a project is a thing with a
screenshot and a paragraph, a drawing is a thing you want to see big, and a post is a notice that
something happened. One layout applied to all three would serve whichever one it was designed for.

What they share is the frame from § Chrome and the element treatment from `app/globals.css` — a link
is `--active`, a date is mono and dim, a rule is a hairline. Nothing below re-decides any of that.

### Coding — rows, newest first

A chronological list. Each entry is **an image on the left and a text box on the right**: title,
date, body, then its links.

The image is whatever shape it was exported — square screenshots and wide ones both occur in
`art/projects/`, and the pipeline deliberately does not crop (`docs/CONTENT.md` § Images). So the
row gives the image a **column width and a ceiling on its height**, rather than forcing a ratio and
cropping a screenshot whose content reaches its edges. The ceiling is what stops a portrait phone
capture — one of them is 684 x 1490 — from making its row three times the height of the text beside
it; a tall image simply sits narrower than the column, and nothing is cropped.

**Both are one number, `--shot`, and it is a fraction of the screen.** Set on 2026-10-21 to the
brief "between a quarter and a third of the screen", which is a fraction of the *viewport* rather
than of the panel, so it is written in `vw`: `clamp(16rem, 33vw, 46rem)` in `app/globals.css` —
29vw for a day, then the top of the band on Henry's say-so the same evening. It
was a flat 19rem column against a 22rem ceiling, two numbers that disagreed — a 600 x 600
screenshot came out 304 wide and the ceiling above it went unused. One number means a square
screenshot fills its column exactly and a portrait one is bounded by that same square. It governs
from `sm` up; below that the row stacks, there is no column, and the plain 22rem ceiling it always
had is what remains.

**No tag row and no skills grid.** Both were there and both were cut on 2026-10-21. A list of
languages above the list, and `#ml #quant` under every entry, are claims the eight projects
underneath already make, and they were the first thing a reader met. The data stays in `content/`;
nothing surfaces it.

Below 768px the row stacks: image above, text below, same order.

**Each row is an anchor.** `#project-<slug>` on the row, because the blog links into this list by
slug and has to be able to scroll to one entry (§ Blog below). The arriving entry is marked briefly
rather than permanently — a 1.2 s rule in `--primary` down its left edge, which says "this one" and
then gets out of the way.

The socials sit at the top, above the list. They were their own hotspots on the old site and then
lived in the about section; they belong at the top of the tab that is about the work they point at.
The résumé and the email address were in this row until 2026-10-21 and are not any more — the row
is where the work is, not how to file a request about it.

**They are a list with the addresses showing, not a row of pills** (2026-10-21, and the Art tab's
row is the same component). A row of small dimmed buttons is the shape a site uses for links it is
obliged to carry; these are the ones it wants followed. So each takes its own line,
`mark · GITHUB: github.com/henryyjiang`, with the address visible rather than hidden behind a word
— more to look at, and legible to someone who is not going to click. The label column has a floor
so the addresses line up as a column of their own, and the whole line is the target.

**The mark and the address text are read off the `href`**, never declared per link, for the reason
the whole of `content/` avoids second sources of truth. The three brand glyphs are inlined
simple-icons paths (CC0); an envelope and a sheet are drawn in `components/overlay/link-icons.tsx`,
because an email and a résumé have no brand to be faithful to.

### Blog — about at the top, then condensed news links

Two parts, and the first is short.

**The about-me section lives here**, moved off the Coding tab on 2026-10-21 and kept brief: the bio,
then favourites as a dense readout. It is the one place on the site that is about Henry rather than
about work, and a blog is where a reader expects to meet the person. The skills grid stayed on
Coding, next to the socials, because it is a credential about the work rather than a personal note.

**Below it the posts are news links, not articles.** Far more condensed than Coding: a square
thumbnail, the date, a headline, one line of body at most. The density is the point — a reader
should take in the whole feed at a glance, and anything that wants a paragraph is a Coding entry or
an Art piece, not a post.

The row is as tall as its thumbnail, so the thumbnail is the dial for how much presence an entry
has; it was turned up on 2026-10-21 because the rows read as a table of contents rather than as
things worth clicking. Note what did *not* change: the body is still one truncated line. Height
bought with a bigger picture keeps the feed scannable, where height bought with more text would
have made it the article list this tab exists not to be.

**The thumbnail is borrowed, not exported.** A post shows the picture of whatever it points at, so
the feed is a column of the same images the other two tabs show at full size — which is what makes
it read as an index of the site rather than as a third collection. A post pointing nowhere keeps the
column and shows no picture.

**A post points into the site, not out of it.** This is the part that makes the blog worth having
rather than a duplicate: the whole box is a link, and it goes to *the thing the post is about* —
scrolling the Coding list to the matching project, or opening the matching Art piece in its popup.
An external `href` is still allowed, for a post about something that genuinely lives elsewhere, and
a post with no target at all reads as plain text. `docs/CONTENT.md` § `posts.ts` has the shape.

### Art — a grid of wide cards, and a popup

A **grid of 16:9 cards**, three across, two at tablet width, one on a phone. The art is cropped to
fill, because a grid of mixed aspects cannot be scanned — this is the one place cropping is right,
and it is cropping the *thumbnail*, never the piece.

**Shaped like a video index**, reworked 2026-10-21. It was square cells, which made each thumbnail
the size of a poster: two pieces filled the panel, and the grid was doing the popup's job instead
of its own. Wide cells, and the title and its medium stacked underneath rather than squeezed onto
one line with it. Half of these pieces are videos and the other half are drawings of a lit street,
so the shape a reader already scans video thumbnails in is the right one.

**Three across, and the gaps carry the air.** Four was tried the same day and the cards came out
smaller than the shape wants — a 16:9 cell has to be wide enough that the art in it is still a
picture rather than a strip. So the count stops at three and the spacing does the work instead:
the row gap is wider than the column gap, which is what makes the eye group a row before it groups
a column, and is most of why a video index reads the way it does.

**Clicking a cell opens the piece in a popup over the whole page**, nav included. The popup is the
same chrome as a panel — near-black ground, hairline border, cut corner, scanlines, telemetry
marker — so it reads as another surface of the same machine rather than as a web lightbox.

**Everything that is not the piece is in the header**, and there is no footer: a title, and the
medium on the telemetry line. The caption bar under the media went on 2026-10-21, because it was a
band of prose across the bottom of something a reader is looking at and it cost the media the
height it was using. The caption is still written in `content/art.ts` and is the image's alt text,
which is the one reader it was always worth most to.

**Nothing on this tab carries a date**, in the grid or in the popup, as of 2026-10-21. This is the
one tab where a timestamp is noise rather than information: a project is dated because a reader is
judging how current the work is, and a post is dated because a post is news — but a drawing does
not expire, and stamping one only tells a reader which pieces are the old ones. `date` stays in
`content/art.ts` and still orders the grid, newest first.

**It arrives on the glitch.** Opening the popup fires one burst of the same transition a route
change fires, from the same code (`components/theme/glitch.ts`). This is the one deliberate
exception to "glitch is only for route changes", and it is consistent with the rule rather than
against it: the popup is a URL state (`/art?piece=<slug>`), so the back button closes it, and what
glitches is a change of destination. Reduced motion gets the crossfade here too.

**A piece can be a video.** The art is animation as much as drawing, so `art/pieces/` takes video
files and the popup plays them with controls, looping, muted by default — the site makes no sound
unless a reader asks for it (§ Accessibility). The grid thumbnail for a video is a frame pulled out
of it by the import, marked with a play glyph, so a video and a drawing cost the same to scan.

## Responsive behaviour

The scene covers the viewport at every size and pans within whatever overflow exists; as the viewport
aspect approaches the scene aspect the pan range shrinks to zero on its own. No aspect-ratio cutoff
like the old site's hard `> 1.6` guard.

**Below 768px the scene is framed rather than followed.** It opens on `FOCAL_POINT` and is explored
by swiping, with all four destinations visible in the nav the whole time. That was settled in Phase 3
once the composition existed; what is left is art direction — which slice to open on — not
architecture. See `docs/ARCHITECTURE.md` § Narrow viewports.

What must hold regardless: **every destination is reachable without panning.** Panning is pleasure,
never the mechanism. The same test applies to the new surfaces: the billboard carousel duplicates
what `/updates` lists, and nothing is only in the scene.

## Accessibility

- The three hotspots exist as focusable DOM controls in a nav landmark, independent of the canvas.
  Keyboard and screen-reader users navigate the site without the scene.
- `prefers-reduced-motion` holds the camera centred, disables parallax, freezes the character on one
  frame, stops the billboard carousel on the newest post, and replaces the glitch transition with a
  short crossfade. Reduced motion means less travel, never less site.
- Panel text is DOM text at real sizes — never baked into the canvas or into images.
- Glow is never the only indicator that something is interactive.
- The billboard carousel is decorative duplication of the blog panel. The canvas is never the only
  place something is said, and the site makes no sound at all.
- Neon is used at display sizes and for accents; body copy keeps a 4.5:1 ratio on its own ground, and
  the glitch transition never carries meaning on its own.
