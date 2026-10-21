/**
 * Content images: the contract between the `art/` inbox and the three collections in
 * `content/`.
 *
 * Project screenshots, art pieces and blog post images are images the *content*
 * needs, not art the *scene* is made of, and the difference is load-bearing. A scene
 * layer is a full 2560 x 1440 frame filed in a parallax band, measured for an alpha
 * hit area, and drawn by Pixi into one canvas. These are photographs and drawings in
 * whatever shape they were exported, shown in a DOM panel — or, for a post, pasted
 * onto the billboard's quad. They share only the optimiser, so they get their own
 * inbox folders, their own output tree and their own manifest rather than being
 * filed into the scene's `layers` or `objects` because that pipeline already exists.
 *
 *   art/projects/<slug>.png  ->  public/images/projects/<slug>.{webp,png}
 *   art/pieces/<slug>.png    ->  public/images/pieces/<slug>.{webp,png}
 *   art/pieces/<slug>.mp4    ->  public/images/pieces/<slug>.mp4 + a poster frame
 *
 * **Posts have no inbox of their own.** A post is a notice about something that is
 * already on the site, so its picture is that thing's picture: `imageForPost` follows
 * the post's `target` into `projects` or `pieces` and returns what it finds. One
 * image, one place, whether it is being shown in a project row, in the feed, or
 * projected onto the billboard — and a project screenshot that gets redrawn updates
 * the post about it without anyone remembering to.
 *
 * **The join is the slug, and nothing writes a path.** A content entry names itself;
 * `npm run art` names the file after that slug; this module puts the two together.
 * So replacing an image is replacing a file in the inbox, and an entry that has no
 * image yet resolves to `null` and renders without one. An image path typed into
 * `content/` would be a second source of truth that goes stale silently the first
 * time a file is renamed — which is exactly what happened to the eight project
 * screenshots that pointed at `/assets/`.
 *
 * Imported rather than fetched: the manifest is generated in this repository and
 * read by it, so the panels resolve their images at build time with no request and
 * no loading state, and a shape change is a type error rather than a surprise in the
 * browser. The cost of that choice is that the file has to exist — it is committed,
 * so it does, and `Cannot find module '../public/images/manifest.json'` means an
 * import was interrupted partway and the fix is to run `npm run art` again.
 *
 * See docs/CONTENT.md and art/README.md.
 */

import type { Post } from '../content/types'
import type { ManifestImage } from './scene-manifest'

import manifest from '../public/images/manifest.json'

/**
 * One per collection in `content/` that has images. The inbox folder names match.
 *
 * `about` holds exactly one picture, the portrait on the Blog tab, and is a
 * collection rather than a file in `public/` so that it is optimised, carries a
 * WebP pair, and is reached by slug like everything else. A one-off `/me.jpg`
 * typed into a component would be the second source of truth this whole module
 * exists to prevent.
 */
export type ImageCollection = 'projects' | 'pieces' | 'about'

/**
 * A piece that arrived as a video rather than as a drawing.
 *
 * The art is animation as much as it is drawing, so `art/pieces/` takes video files
 * and the import transcodes them (`docs/CONTENT.md` § Images). **Which one a piece is
 * belongs to the file, not to the content entry** — the same rule that keeps paths
 * out of `content/`. A piece with this field is played in the popup; the `src` and
 * `fallback` beside it are a poster frame pulled out of the video, so the grid can
 * show a video and a drawing at the same cost.
 */
export type ContentVideo = {
  /** Path under public/, so browser-absolute. */
  src: string
  /** For `<source type>`, so the browser can skip what it cannot play. */
  type: string
  width: number
  height: number
}

/**
 * An optimised image: WebP, with a PNG fallback at the same pixels.
 *
 * Built on the scene's own image type — both come out of the same encoder in
 * `scripts/import-art.ts`, so a consumer that can pick between WebP and the fallback
 * for a layer can do it for a post image without a second code path.
 *
 * The two optional fields exist because of *where the image is shown*, which is why
 * they are here rather than in `content/`:
 *
 *   - `lit` is on whichever images a post points at, and only those. The billboard
 *     is a screen in a neon city, and a photo at its own saturation reads as a
 *     picture on a wall, so the import bakes a saturation-boosted copy and the
 *     carousel projects that one. It carries the image's measured brightness, which
 *     is what tells the glow how hard to lift it. Every panel uses the unmodified
 *     image, because a panel is a document (docs/DESIGN.md § The billboard).
 *   - `video` is pieces only. See `ContentVideo`.
 */
export type ContentImage = ManifestImage & {
  lit?: LitImage
  video?: ContentVideo
}

/**
 * The billboard's copy of an image, and how bright it is.
 *
 * `luma` is its average Rec. 709 luminance, 0 to 1, measured at import. The carousel
 * uses it to decide how hard to brighten this image before blurring it into the
 * billboard's glow: a dark screenshot emits nothing without the lift, and a neon
 * drawing needs none (docs/DESIGN.md § The billboard).
 */
export type LitImage = ManifestImage & { luma: number }

export type ContentImageManifest = {
  generatedAt: string
  /** Keyed by collection, then by slug. A collection with no images is `{}`. */
  images: Record<ImageCollection, Record<string, ContentImage>>
}

/**
 * Cast once, here.
 *
 * `resolveJsonModule` types the import as the literal shape of whatever is in the
 * file today — the slugs that happen to be in it become keys — so indexing it by an
 * arbitrary slug is a type error until it is read as the manifest it is. The
 * generator writes this shape; `ContentImageManifest` is what both sides agree on.
 */
const MANIFEST = manifest as ContentImageManifest

/**
 * The image for a content entry, or `null` if nothing has been dropped in for it.
 *
 * `null` is an ordinary case, not an error: a project can be worth listing before
 * there is a screenshot of it, and a post renders on the billboard as a headline on
 * the unlit surface. The import is where a missing image is *reported*, because that
 * is where someone can act on it — a render that silently drops an image is how a
 * mistyped slug survives, and a render that throws is how it takes the page with it.
 */
export function imageFor(collection: ImageCollection, slug: string): ContentImage | null {
  return MANIFEST.images[collection][slug] ?? null
}

/**
 * The picture for a blog post: the one belonging to whatever the post points at.
 *
 * Posts do not have images of their own. A post is a line saying something happened,
 * and the thing that happened — a project, a drawing — already has a picture; giving
 * the post a second one would mean two files to keep in step and a choice to make
 * every time about which is "the" image of the same event.
 *
 * So this is `imageFor`, with the collection taken from the post's target. A post
 * pointing at a video piece gets that video's poster frame, which is the still of it
 * that already exists. An external or targetless post has no image, which is an
 * ordinary state everywhere it is shown: the feed keeps the column and the billboard
 * shows a headline on the unlit surface.
 */
export function imageForPost(post: Post): ContentImage | null {
  switch (post.target?.to) {
    case 'project':
      return imageFor('projects', post.target.slug)
    case 'piece':
      return imageFor('pieces', post.target.slug)
    default:
      return null
  }
}

/** When `npm run art` last wrote the manifest. For debugging a stale import. */
export const GENERATED_AT = MANIFEST.generatedAt
