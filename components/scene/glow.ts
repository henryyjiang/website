'use client'

import { ColorMatrixFilter, type Sprite } from 'pixi.js'

import type { ManifestObject } from '@/lib/scene-manifest'

/** Brightness at full hover. Restrained on purpose — see the note below. */
export const GLOW_BRIGHTNESS = 1.35

/** Easing rate per second, matching the camera's damping so the glow cannot pop. */
export const GLOW_SPRING = 14

/**
 * Hover feedback for one object.
 *
 * A class, like `CameraRig`, because the glow value is mutated every frame from
 * inside the ticker. Per-frame state belongs in an object that owns its own
 * mutation rather than in a plain record reached through a ref.
 *
 * The treatment is deliberately restrained — a brightness lift, nothing more. The
 * old site used a stacked blue `drop-shadow`, which read as a UI effect pasted onto
 * the art rather than light in the room. What should replace it depends entirely on
 * how the real room is lit, so docs/DESIGN.md defers that to Phase 3 and this stands
 * in until then without pre-deciding the look.
 */
export class HotspotGlow {
  private glow = 0
  private readonly filter = new ColorMatrixFilter()

  constructor(readonly object: ManifestObject) {
    this.filter.brightness(1, false)
  }

  /**
   * Ease toward `target` (1 hovered, 0 not) and apply the result to `sprite`.
   *
   * The sprite is passed in per frame rather than held as a field, because the two
   * are created in different phases: Pixi ref callbacks fire during commit, while
   * the effect that builds these objects runs after it. Storing the sprite here
   * meant the ref arrived before the object existed and the glow silently never
   * attached — correct hover state, no visible effect.
   *
   * The filter is detached entirely once the glow reaches zero: an attached filter
   * costs a render target every frame it is present, and three idle objects should
   * cost nothing at all.
   */
  update(sprite: Sprite | null | undefined, target: number, t: number): void {
    this.glow += (target - this.glow) * t

    if (!sprite) return

    if (this.glow < 0.01) {
      this.glow = 0
      if (sprite.filters && (sprite.filters as unknown[]).length > 0) {
        sprite.filters = []
      }
      return
    }

    this.filter.brightness(1 + (GLOW_BRIGHTNESS - 1) * this.glow, false)
    if (!sprite.filters || (sprite.filters as unknown[]).length === 0) {
      sprite.filters = [this.filter]
    }
  }

  destroy(): void {
    this.filter.destroy()
  }
}
