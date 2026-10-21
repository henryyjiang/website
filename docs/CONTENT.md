# Content model

All copy and data lives in `content/` as typed TypeScript modules. Components read it; they never
contain it.

The old site hardcoded every project directly into `index.html` — roughly 15 lines of nested markup
per entry, with the description, links and image path interleaved into the structure. Adding a
project meant editing the page, and there was no way to sort, filter or reuse an entry. The billboard
carousel makes that untenable anyway, since the same posts have to appear in two places.

## Collections

### `projects.ts`

Software and AI research work. Surfaced in the **desk** panel.

```ts
type Project = {
  slug: string
  title: string
  date: string            // ISO. Required — the list is timestamped.
  blurb: string           // One or two sentences.
  detail?: string         // Longer body, if the entry warrants one.
  tags: string[]          // e.g. ['ml', 'quant', 'ios']
  links: { label: string; href: string }[]
}
```

`date` is required and the list sorts on it at render time. Ordering is never a function of array
position — that was an implicit, invisible decision in the old markup.

The screenshot is not in this file. It is `art/projects/<slug>.png` and is resolved by slug, like
every other image the content refers to — see **Images** below. The eight carried over from the old
site had their paths written in here and pointed at `/assets/`, a folder that was never under
`public/`; all eight 404'd and nothing said so.

Carry over from the old site: fwubbo, the POTS flare-up predictor, the Hawkes/kinetic HFT model, the
quantum-walk BQP model, the Mandelbrotian volatility options model, Darwin, Batstick, and the
automated intersection management project. Dates will need to be reconstructed — the old markup had
none.

### `art.ts`

Drawing and animation work. Surfaced in the **art** panel.

```ts
type ArtPiece = {
  slug: string
  title: string
  date: string            // ISO
  medium?: string         // '2D', '3D', 'animation', ...
  caption?: string
}
```

The image is `art/pieces/<slug>.png`, resolved by slug — see **Images**. A piece with no image yet
still lists; it renders as its text.

**A piece can be a video**, and nothing in this file says so. Drop `art/pieces/<slug>.mp4` (or
`.webm`, or `.mov`) instead of a PNG and the import transcodes it, pulls a poster frame out of it,
and records both in the manifest; the grid shows the frame with a play glyph and the popup plays the
video. Which one a piece is belongs to the file, not to the entry — the same reason no entry writes
a path. `medium` is free text for the reader ('2D', 'animation', 'Blender'), never a format switch.

This collection had no equivalent on the old site — the art was represented only by a link out to
TikTok. Its presentation is settled now: a grid of wide 16:9 cards, a popup over the whole page,
and the glitch transition on open. See `docs/DESIGN.md` § Panel interiors.

`caption` is **not displayed**. It is the alt text on the piece's image, and the popup shows the
title, the date and `medium` only — the bar it used to sit in went on 2026-10-21.

### `posts.ts` — the blog

**One source, two surfaces:** the billboard carousel in the scene reads the newest three; `/updates`
lists all of them. The billboard must not hold its own copy.

```ts
type Post = {
  slug: string            // Stable join key. Never a route segment, never a filename.
  date: string            // ISO
  title: string           // Short enough to read on a billboard at a glance.
  body?: string           // One line. Shown on the Blog panel, not the billboard.
  target?: PostTarget     // What clicking the post goes to. See below.
  credit?: string         // If the image is not Henry's.
}

type PostTarget =
  | { to: 'project'; slug: string }     // A Coding entry, scrolled to.
  | { to: 'piece'; slug: string }       // An Art piece, opened in its popup.
  | { to: 'external'; href: string }    // Something that really is elsewhere.
```

**`target` is the blog's whole point.** A post is a notice that something happened, and the thing
that happened is nearly always already on the site — a project on the Coding tab, a drawing in the
Art grid. So the post links *inward*: `{ to: 'project' }` goes to `/desk#project-<slug>` and the
Coding panel scrolls that row into view and marks it briefly; `{ to: 'piece' }` goes to
`/art?piece=<slug>` and the Art popup opens on it. `{ to: 'external' }` is the escape hatch, and a
post with no target reads as plain text.

**The slug in a target is checked against the collection it names.** It is a join key like every
other slug here, and a mistyped one would otherwise link to an anchor that does not exist — the one
failure mode a reader experiences as the site being broken. `npm run art` reports it, because that
is the command that already checks every other slug join in this folder.

The billboard constrains `title`: it has to work as large, brief, legible-at-distance text over a
photograph. Treat it as a headline, not a sentence, and keep the prose in `body`.

**Posts do not get their own URLs.** The blog is one page holding a series of posts, not a set of
individually addressable pages, so `slug` is a join key and never a route segment. It still has to
be stable, because it is what ties a post to its image.

**A post has no image of its own, and no inbox.** It borrows the picture belonging to whatever it
points at: `{ to: 'project' }` shows that project's screenshot, `{ to: 'piece' }` shows that drawing
— or, for a video piece, its thumbnail. `imageForPost` in `lib/content-images.ts` is the whole
mechanism.

That is a smaller idea than it sounds, and it removes a decision rather than adding one. A post and
the thing it announces are the same event, so giving the post a second picture of it would mean two
files to export, two to keep in step, and a choice every time about which one is "the" image. This
way there is nothing to export at all, and a screenshot that gets redrawn updates the post about it
without anyone remembering to.

A post with an external target or none has no image, which degrades the same way it always did: the
feed keeps the column and the billboard shows a headline on the unlit surface.

**Images are projected onto the billboard quad and cropped to fill**, so compose for a wide
rectangle and keep anything that matters away from the edges. The build does not crop them; it keeps
the aspect it is given and the mesh covers the quad, which means a tall image loses its top and
bottom. Full-bleed, roughly 16:9, is the shape to export.

This file was `updates.ts` through Phase 2, when it was a changelog of three-line entries. It is a
blog now — same two-surface rule, more per entry. The route stays `/updates` so shared links keep
working, and `content/nav.ts` labels it **Blog**, which is what a reader calls it.

### `links.ts`

Socials and GitHub. Surfaced in the **desk** panel.

```ts
type Link = { label: string; href: string; icon?: string }
```

Known so far: LinkedIn (`henryyjiang`), GitHub (`henryyjiang`), TikTok (`@atrxiy`). The résumé
(`resume.pdf`) and the email address are still in the module and are **not surfaced** — Henry took
them out of both rows on 2026-10-21. Putting one back in `CODING_LINKS` or `ART_LINKS` is the whole
change; the row reads its glyph and its displayed address off the `href`.

### `about.ts`

The about-me copy for the desk panel. Prose, kept as structured fields rather than one blob so the
panel can lay it out.

The old site's about section mixed a short bio with a list of favourite anime, manga, songs, games
and a currently-watching list. Worth keeping — it gives the page personality that a project list
can't — but it should be a deliberate, structured section rather than `<br>`-separated lines.

## Images

Three collections, one rule: **the slug is the join, and no content module writes a path.**

| Collection | Inbox | Output | Resolved with |
| --- | --- | --- | --- |
| `projects.ts` | `art/projects/<slug>.png` | `public/images/projects/` | `imageFor('projects', slug)` |
| `art.ts` | `art/pieces/<slug>.{png,mp4}` | `public/images/pieces/` | `imageFor('pieces', slug)` |
| `posts.ts` | — borrows its target's | — | `imageForPost(post)` |

`npm run art` — the same one command that imports the scene — optimises each image to WebP with a
PNG fallback, caps it at 1600px on its longest side, and writes `public/images/manifest.json`.

Two things are produced beyond the pair, both because of where the image is *shown*:

- **A `lit` variant** on whichever images a post points at, and only those — the same image with its
  saturation pushed well past the original and a slight brightness lift, which is what the billboard
  projects. It carries a `luma`: the image's average brightness, measured at import, which is what
  tells the carousel how hard to lift this particular image before blurring it into the billboard's
  glow (`docs/DESIGN.md` § The billboard). A photo at its own saturation reads as a picture on a wall rather than a screen in a neon
  city (`docs/DESIGN.md` § The billboard). Every panel uses the unmodified one. It is baked only for
  the referenced images because each one is a second encoding of a file this repository already
  carries.
- **Video, in `pieces/`.** `art/pieces/<slug>.mp4|.webm|.mov|.m4v` is transcoded to a faststart H.264
  MP4 under the same long-side cap, and the manifest entry carries the video beside an ordinary
  image pair. So a drawing and an animation enter the project the same way: one file, named after
  its slug.

**A video gets a thumbnail whether or not you make one.** Three surfaces show a piece without
playing it — the grid's square cell, the blog feed, and the billboard — so the import always
produces a still: a frame from a second in by default, or, if a file of the same slug sits beside
the video (`motion-test.mp4` + `motion-test.png`), that one. The automatic frame is still extracted
either way, because it is also how the video's own dimensions are measured, and a chosen thumbnail
may be any shape. Two files of the *same kind* under one slug remain a collision and still warn.
`lib/content-images.ts` reads that manifest and hands back the pair. Adding a picture is therefore:
export it into the inbox folder under the entry's slug, run `npm run art`. No component changes, and
no path is typed anywhere.

**These are not scene art and do not go through the scene's pipeline.** A layer is a full
2560 × 1440 frame filed in a parallax band, measured for an alpha hit area and drawn into the Pixi
canvas; these are photographs and drawings in whatever shape they were exported, shown in a DOM
panel or pasted onto the billboard's quad. They share the optimiser and nothing else, so they get
their own inbox folders, their own output tree and their own manifest rather than being filed into
`layers` or `objects` because that pipeline was already there. Both manifests are generated; neither
is ever edited by hand.

**Both directions of the join are checked at import.** An entry with no image is reported, and so is
an image no entry claims — the second is the one that catches a mistyped filename, which otherwise
imports perfectly and then appears nowhere. Neither is an error: an unclaimed image is imported
anyway, so dropping a picture in *before* writing its entry works and adding the entry is enough to
show it.

**A missing image is an ordinary state, not a failure.** `imageFor` returns `null`, the panel
renders the entry's text, and the billboard shows a headline on the unlit surface. The import is
where it is reported, because that is where someone can act on it.

## Conventions

- **Dates are ISO strings** (`2026-10-17`), formatted for display at render. Never pre-formatted in
  the data.
- **Slugs are stable.** They are join keys between a content entry and its art; renaming one
  silently detaches the image.
- **No content module writes an image path.** Every image is resolved from the content-image
  manifest by slug (see **Images**), so a path cannot go stale, point outside `public/`, or lose its
  WebP fallback. The one hand-written path left in `content/` is `resume.pdf`, which is a document
  Henry dropped into `public/` himself rather than something the import produces.
- **Content modules import nothing from `components/`.** The dependency runs one way.
- Validate shapes with types alone unless something starts going wrong at runtime; this is a static
  site and the content is authored by hand in-repo.

## Résumé

`resume.pdf` is carried over from the old site and lives in `public/`. **Nothing links to it as of
2026-10-21** — it came out of the desk panel's row along with the email address — but it is still
served, and `RESUME` is still written in `content/links.ts`. Keep the filename stable: it may
already be linked externally.
