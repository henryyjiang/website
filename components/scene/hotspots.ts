/**
 * The three hotspots: which object in the room leads where.
 *
 * The DOM half of the duplication is `components/nav/TopNav.tsx`, reading
 * `content/nav.ts` — a visible list of destinations rather than this list of
 * objects, because that is the useful shape for a nav and because it also carries
 * Home, which is not an object in the room.
 *
 * Note what is *not* here any more: the rectangles. Hit areas are measured from the
 * art's alpha at import time and arrive in the manifest, so a redrawn object brings
 * its own hit area with it. A rectangle declared here would be a second source of
 * truth that silently went stale the first time Henry moved the desk — which is
 * exactly how the old site's invisible buttons ended up off the furniture.
 *
 * `band` stays, because it is a design decision rather than a measurement: the
 * billboard is seen through the glass, so it travels at the skyline's parallax factor
 * (docs/DESIGN.md § The three hotspots). lib/scene-layout.ts still carries footprint
 * rectangles, but only as an authoring guide for the template and the placeholders.
 */

import type { BandId } from './bands'

/**
 * How one object emits.
 *
 * Split between bake and runtime because the two cost different things. `blur` and
 * `boost` shape the texture `npm run art` writes, so they are free at runtime and
 * cost nothing to make extreme. `standing` and `peak` are the sprite's alpha, which
 * is the only part that can change while the scene is running.
 *
 * The important consequence: to make something glow *further* or *brighter* than
 * alpha 1 allows, raise `blur` or `boost` and re-run `npm run art`. Winding the
 * alpha up alone just saturates toward the texture it already has.
 */
export type GlowSpec = {
  /**
   * Gaussian sigma at quarter canvas scale — so 8 here is a 32px spread on the
   * design canvas. How far the light reaches past the object's silhouette.
   */
  blur: number
  /** Brightness multiplier at bake time. Above 1 the glow reads as emitting rather than lit. */
  boost: number
  /** Saturation multiplier at bake time. Keeps the glow the object's colour, only more so. */
  saturation: number
  /**
   * How hard the falloff is lifted after the blur, as the exponent in
   * `1 - (1 - alpha)^gain`. 1 leaves it alone; higher pulls the faint outer halo up.
   *
   * This is the lever that actually makes a glow strong, and it is not obvious why.
   * Blurring spreads an object's alpha over a much larger area, and spreading a
   * fixed amount of opacity thinner is exactly what it sounds like — the halo
   * reaches further and is fainter everywhere, so raising `blur` alone makes a glow
   * weaker, not stronger. This puts the intensity back across the widened area.
   *
   * It is a curve rather than a multiplier on purpose. A multiplier clips at opaque,
   * which flattens most of the halo and leaves a hard ring where the clipping stops
   * — it reads as an outline drawn around the object rather than as light coming off
   * it. This approaches opaque asymptotically and never lands on it.
   */
  gain: number
  /**
   * Alpha when nothing is hovered.
   *
   * Zero for furniture, because a desk does not emit and lighting it unprompted
   * would say "this is interactive" about the whole room at once. High for the
   * billboard, which is a screen: it is lit whether or not anyone is pointing at
   * it, and hovering lifts that standing glow rather than switching one on.
   */
  standing: number
  /** Alpha at full hover. */
  peak: number
}

/** What furniture does: nothing until you point at it. */
const FURNITURE: GlowSpec = {
  blur: 7,
  boost: 1,
  saturation: 1.7,
  gain: 1.5,
  standing: 0,
  peak: 0.9,
}

export type Hotspot = {
  id: 'desk' | 'bed' | 'billboard'
  href: string
  band: BandId
  /**
   * Whether this object's own art is drawn, or whether it exists only to be
   * measured.
   *
   * Every object is measured for a hit area, an inner rect and a surface quad, and
   * most of them are also the picture of a thing in the room. The billboard is not,
   * any more: Henry painted its screen out of `skyline.png` on 2026-10-21 once the
   * carousel was landing on the right four corners, so the only thing left in that
   * part of the city is the frame around a hole, and what fills the hole is the
   * projected post image. The object file stays as the record of *where the screen
   * is* — a shape, not art.
   *
   * The import still writes its texture and its glow, so this is one constant away
   * from being drawn again and needs no re-import to flip. The renderer simply does
   * not load them, which also saves two full-canvas textures' worth of video memory
   * for art nobody sees.
   */
  drawn: boolean
  /**
   * How this object emits.
   *
   * Here rather than in `glow.ts` or in the import script for the same reason `band`
   * is here: it is a design decision about what a thing *is*, not a measurement
   * taken off the art. The import reads it to bake the texture and the scene reads
   * it to drive the alpha, so there is one table and not two.
   */
  glow: GlowSpec
}

export const HOTSPOTS: readonly Hotspot[] = [
  {
    id: 'desk',
    href: '/desk',
    band: 'room',
    drawn: true,
    glow: FURNITURE,
  },
  {
    // The object is a bed and the destination is the drawing portfolio, so the id
    // and the route differ on purpose: ids name what is in the room, because that
    // is what the art files are named after and what the hit test matches.
    id: 'bed',
    href: '/art',
    band: 'room',
    drawn: true,
    glow: FURNITURE,
  },
  {
    id: 'billboard',
    href: '/updates',
    band: 'skyline',
    // A shape, not art. See `drawn` above.
    drawn: false,
    // A floodlit screen the size of a building, and it should read like one: a bright
    // rim against the billboard frame that falls away into the city.
    //
    // Since the screen stopped being painted, nothing bakes a glow for it that anyone
    // sees — `standing` and `peak` drive the carousel's own glow instead, rendered
    // from whichever post image is up (components/scene/BillboardSurface.tsx). The
    // bake-time numbers below are kept because they still shape the texture the
    // import writes, and because flipping `drawn` back would want them.
    //
    // The blur is the delicate number. Henry drew a black frame roughly 90 scene px
    // wide around the lit surface, and a glow whose falloff is longer than that lights
    // the whole frame evenly — which turns the frame into a flat lit band with a hard
    // edge where it meets the city, and reads as an outline rather than as light. The
    // falloff has to finish inside that band. Widening this without re-checking that
    // edge is how the hard line comes back.
    glow: {
      blur: 14,
      // Only a little, deliberately: the screen is already near-white, and anything
      // above about 1.2 clips every channel and the glow comes out colourless.
      // Strength comes from `gain`, which does not touch hue.
      boost: 1.15,
      saturation: 2,
      gain: 4,
      // The gap between these two is the whole hover affordance, and alpha cannot go
      // above 1 — so widening it means lowering the resting level, not raising the
      // hovered one. There is room to: the carousel's glow is brightness-normalised
      // per image now (BillboardSurface.tsx), which left the screen reading as lit at
      // rest well below where it used to need to be. 0.6 to 1 is two thirds again on
      // hover where 0.7 to 1 was two fifths, and the screen is still plainly on when
      // nobody is pointing at it.
      standing: 0.6,
      peak: 1,
    },
  },
]

/** Whether this object's art is drawn at all. Unknown ids are drawn, like any layer. */
export function isDrawnObject(id: string): boolean {
  return HOTSPOTS.find((hotspot) => hotspot.id === id)?.drawn ?? true
}
