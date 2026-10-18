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
| **Billboard** | Skyscraper billboard, in the background through the window | Carousel of recent updates; opens the full changelog |

Three is a deliberate reduction from the old site's eight (beanbag, desk, bookshelf, speaker,
skateboard, LinkedIn, GitHub, résumé). Those scattered one destination per object; these group by
domain, and the things that used to be their own hotspots — socials, GitHub, résumé, about — become
content inside the desk panel.

**The billboard is the interesting one.** It is the only hotspot in the background band, which means
it sits behind the glass and parallaxes differently from the room objects. That is a feature: it
reads as genuinely far away, and it gives the skyline a reason to be looked at. It also means its
hit area moves at the `skyline` parallax factor rather than the `room` factor, so hit testing must
go through the same scene transform as everything else rather than assuming a single plane.

The carousel on the billboard surface and the `/updates` page are **two views of one data source**.
See `docs/ARCHITECTURE.md`.

## Visual direction

**Away from retro.** The old site was retro-leaning — pixel textures, a glitch intro, hard-edged
panels, a CRT sensibility. That is being dropped.

**Toward flowy, animated, energetic.** Motion as a first-class part of the design rather than a
transition between static states. Continuity between views instead of cuts. Things that ease, drift,
and respond.

This direction is firm for the scene. For the **interiors of the three panels it is the only
guidance that exists** — the specific design is undecided and intentionally deferred to Phase 4.
Don't invent it early, and don't let placeholder panel styling harden into a decision by default.

## Lighting and glow

Hover feedback on the old site was a stacked `filter: drop-shadow` in blue, applied to the whole
layer. It worked but read as a UI effect pasted onto the art rather than light in the room.

With Pixi, hover feedback is a filter on the sprite in the same render pass as the scene, which
opens up warmer and more physical options — a soft bloom, a rim light, a slight brightening of
nearby surfaces. The scene's own light should motivate it: a city at night behind floor-to-ceiling
glass is a strong, directional, coloured light source, and hover highlights that look like they come
from somewhere will sit much better than a blue outline.

Not settled. Worth trying once real art exists, because it depends entirely on how the room is lit.

## Responsive behaviour

The scene covers the viewport at every size and pans within whatever overflow exists; as the viewport
aspect approaches the scene aspect the pan range shrinks to zero on its own. No aspect-ratio cutoff
like the old site's hard `> 1.6` guard.

Narrow viewports are an open question. The room is a wide composition, and a phone sees very little
of it. Options, to decide when the real art exists and not before:

- Pan the camera on device orientation instead of pointer
- A tighter crop of the scene with the three hotspots still in frame
- A separate stacked layout on small screens that keeps the scene as a header

What must hold regardless: **all three destinations are reachable without panning.** Panning is
pleasure, never the mechanism.

## Accessibility

- The three hotspots exist as focusable DOM controls in a nav landmark, independent of the canvas.
  Keyboard and screen-reader users navigate the site without the scene.
- `prefers-reduced-motion` holds the camera centred, disables parallax, and removes travel from panel
  transitions.
- Panel text is DOM text at real sizes — never baked into the canvas or into images.
- Hover glow is never the only indicator that something is interactive.
