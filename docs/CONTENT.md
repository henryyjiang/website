# Content model

All copy and data lives in `content/` as typed TypeScript modules. Components read it; they never
contain it.

The old site hardcoded every project directly into `index.html` — roughly 15 lines of nested markup
per entry, with the description, links and image path interleaved into the structure. Adding a
project meant editing the page, and there was no way to sort, filter or reuse an entry. The billboard
carousel planned for this version makes that untenable anyway, since the same updates have to appear
in two places.

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
  image?: string          // Path under public/
}
```

`date` is required and the list sorts on it at render time. Ordering is never a function of array
position — that was an implicit, invisible decision in the old markup.

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
  image: string
  caption?: string
}
```

This collection has no equivalent on the old site — the art was represented only by a link out to
TikTok. It needs real thought about presentation, since a portfolio of images has different needs
from a list of projects: it wants a grid or a reel, and probably a lightbox.

### `updates.ts`

The changelog. **One source, two surfaces:** the billboard carousel in the scene reads the most
recent few; `/updates` lists all of them. The billboard must not hold its own copy.

```ts
type Update = {
  date: string            // ISO
  title: string           // Short enough to read on a billboard at a glance.
  body?: string           // Shown on the /updates page, not the billboard.
  href?: string           // Optional link to the thing that changed.
}
```

The billboard constrains this type: `title` has to work as large, brief, legible-at-distance text.
Treat it as a headline, not a sentence, and keep the prose in `body`.

### `links.ts`

Socials, GitHub, résumé. Surfaced in the **desk** panel.

```ts
type Link = { label: string; href: string; icon?: string }
```

Known so far: LinkedIn (`henryyjiang`), GitHub (`henryyjiang`), TikTok (`@atrxiy`), résumé
(`resume.pdf`), email.

### `about.ts`

The about-me copy for the desk panel. Prose, kept as structured fields rather than one blob so the
panel can lay it out.

The old site's about section mixed a short bio with a list of favourite anime, manga, songs, games
and a currently-watching list. Worth keeping — it gives the page personality that a project list
can't — but it should be a deliberate, structured section rather than `<br>`-separated lines.

## Conventions

- **Dates are ISO strings** (`2026-10-17`), formatted for display at render. Never pre-formatted in
  the data.
- **Slugs are stable.** They may end up in URLs; don't rename them casually.
- **Image paths are repo-absolute** under `public/`, so a component never has to guess at a prefix.
- **Content modules import nothing from `components/`.** The dependency runs one way.
- Validate shapes with types alone unless something starts going wrong at runtime; this is a static
  site and the content is authored by hand in-repo.

## Résumé

`resume.pdf` is carried over from the old site and lives in `public/`. It is linked from the desk
panel. Keep the filename stable — it may already be linked externally.
