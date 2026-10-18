'use client'

import { maskHitTest, type ManifestObject } from '@/lib/scene-manifest'
import { type Camera, screenToScene, type SceneTransform } from '@/lib/scene-space'
import type { HotspotId } from '@/lib/store'
import { BANDS } from './bands'
import type { LoadedObject } from './useSceneAssets'

export type HitTestable = {
  object: ManifestObject
  loaded: LoadedObject
}

/**
 * Which hotspot is under this screen point?
 *
 * Two things make this correct that a simpler version would get wrong.
 *
 * First, each object is unprojected through *its own band's* parallax factor. The
 * billboard sits in the background, behind the glass, so at any camera position it
 * is drawn somewhere different from where a room-plane assumption would put it.
 * Sharing one transform across bands would make it unclickable exactly when the
 * camera is off centre.
 *
 * Second, the test is against the art's alpha, not a bounding box. A rectangle
 * around a desk catches the empty air above it, and a hover glow that fires over
 * nothing feels broken. The mask comes from the art itself (measured at import), so
 * redrawn art brings its own hit area and the two cannot drift apart.
 */
export function hitTest(
  candidates: readonly HitTestable[],
  transform: SceneTransform,
  camera: Camera,
  screenX: number,
  screenY: number,
): HotspotId | null {
  // Front to back, so the nearest object wins where two overlap.
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i]!
    const factor = BANDS[candidate.object.band].factor

    const scene = screenToScene(transform, camera, factor, screenX, screenY)

    if (maskHitTest(candidate.object, candidate.loaded.cells, scene.x, scene.y)) {
      return candidate.object.id as HotspotId
    }
  }

  return null
}

/**
 * Sort candidates back to front, so `hitTest` can walk them in reverse.
 *
 * Band draw order first, then z within the band — the same order they are rendered
 * in, which is what makes "the nearest object wins" mean what it looks like.
 */
export function inHitOrder(candidates: readonly HitTestable[]): HitTestable[] {
  return [...candidates].sort(
    (a, b) =>
      BANDS[a.object.band].z - BANDS[b.object.band].z || a.object.z - b.object.z,
  )
}
