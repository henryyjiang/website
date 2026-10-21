/**
 * What the scene degrades to where WebGL is unavailable: the room as one flat
 * picture, no camera, no parallax, no character. The site must still function as a
 * portfolio, and the three destinations are reachable from the DOM nav regardless of
 * what the canvas is doing (docs/ARCHITECTURE.md § Performance policy).
 *
 * This is the real scene rather than an impression of it. `npm run art` stacks the
 * same layers and objects the canvas draws, in the renderer's own draw order, and
 * writes the result as `site.composite` — so the fallback cannot drift from the room
 * the way the hand-written gradient it replaces had already started to, having been
 * authored before any of the art existed.
 *
 * What it does *not* show is the billboard's carousel, which is a Pixi mesh. That is
 * correct rather than a gap: without WebGL there is no carousel, so the billboard is
 * dark here exactly as it would be on screen.
 *
 * Only ever mounted when WebGL is missing or the manifest failed to load, never
 * while the scene's assets are in flight, so its bytes are not on the common path.
 */
import { SITE_COMPOSITE } from '@/lib/content-images'

export function StaticSceneFallback() {
  return (
    <picture>
      <source srcSet={SITE_COMPOSITE.src} type="image/webp" />
      <img
        src={SITE_COMPOSITE.fallback}
        alt=""
        width={SITE_COMPOSITE.width}
        height={SITE_COMPOSITE.height}
        // `object-cover` for the same reason the canvas scales to cover: the scene
        // has to reach every edge of the viewport at any aspect, and letterboxing it
        // would show the page behind where the room should be.
        className="absolute inset-0 size-full bg-ground object-cover"
      />
    </picture>
  )
}
