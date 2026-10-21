'use client'

import type { Container } from 'pixi.js'

import type { ManifestObject } from '@/lib/scene-manifest'
import type { GlowSpec, Hotspot } from './hotspots'

/** Easing rate per second, matching the camera's damping so the glow cannot pop. */
export const GLOW_SPRING = 14

/**
 * Hover feedback for one object: light, not exposure.
 *
 * The city behind the glass is painted with glow around every lit sign — Henry makes
 * them by duplicating a layer, dropping the copy underneath and blurring it. The
 * brightness lift this used to do raised an object's *exposure*, which read as a UI
 * effect pasted onto a scene where everything else emits. So hovering emits instead,
 * by the same recipe: `npm run art` bakes the blurred copy, and this fades it in
 * behind the object.
 *
 * Because the glow texture is the object's own pixels, it is the object's own
 * colours. Nothing here picks a tint, and a redrawn object brings its new one along.
 *
 * A class, like `CameraRig`, because the value is mutated every frame from inside
 * the ticker. Per-frame state belongs in an object that owns its own mutation rather
 * than in a plain record reached through a ref.
 */
export class HotspotGlow {
  private level: number

  constructor(
    readonly object: ManifestObject,
    /**
     * This object's glow, straight off the hotspot table.
     *
     * Only `standing` and `peak` are used here — `blur`, `boost` and `saturation`
     * shaped the texture at import and are nothing the runtime can change.
     */
    private readonly spec: GlowSpec,
  ) {
    // Start at rest rather than at zero, so the billboard is already lit on the
    // first frame instead of easing up from dark while the scene fades in.
    this.level = spec.standing
  }

  /**
   * Ease toward `target` (1 hovered, 0 not) and apply the result to `view`.
   *
   * A `Container` rather than a `Sprite`, because the billboard's is a stack of
   * several additive copies rather than one — alpha stops at 1 and additive light
   * does not, so going brighter than a single quad allows means drawing more of them
   * (components/scene/BillboardSurface.tsx). Only `alpha` and `visible` are touched
   * either way, and a sprite is a container.
   *
   * It is passed in per frame rather than held as a field, because the two are
   * created in different phases: Pixi ref callbacks fire during commit, while the
   * effect that builds these objects runs after it. Storing it here meant the ref
   * arrived before the object existed and the glow silently never attached —
   * correct hover state, no visible effect.
   *
   * `presence` scales the whole thing, and exists for one case: the billboard has
   * two glows and only ever wants one of them. Its baked glow is a blurred copy of
   * the *unlit* screen Henry painted, so while a post image is projected over that
   * screen the light coming off the building would be peach no matter what is
   * showing — which is wrong, and conspicuously so. The carousel's own glow takes
   * over instead, and this is how each is faded out of the other's way. Scaling the
   * target rather than the result is what keeps that a crossfade: the easing below
   * still runs, so neither glow can pop when a slide changes.
   */
  update(
    view: Container | null | undefined,
    target: number,
    t: number,
    presence = 1,
  ): void {
    const want =
      (this.spec.standing + (this.spec.peak - this.spec.standing) * target) * presence
    this.level += (want - this.level) * t

    if (!view) return

    // Below this the sprite is contributing nothing an eye could see, so stop
    // drawing it. An additive quad is cheap, but three of them over the whole canvas
    // every frame for nothing is not free either.
    if (this.level < 0.004) {
      this.level = 0
      view.visible = false
      return
    }

    view.visible = true
    view.alpha = this.level
  }
}

/** This object's glow spec, or a dark one if it is not a hotspot. */
export function glowSpecFor(hotspots: readonly Hotspot[], id: string): GlowSpec {
  return (
    hotspots.find((hotspot) => hotspot.id === id)?.glow ?? {
      blur: 0,
      boost: 1,
      saturation: 1,
      gain: 1,
      standing: 0,
      peak: 0,
    }
  )
}
