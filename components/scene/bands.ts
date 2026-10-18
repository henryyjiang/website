/**
 * The parallax band table.
 *
 * Depth is a design decision made in one place rather than scattered across sprites:
 * a layer declares which band it is in, and the band decides how fast it travels.
 * See docs/ARCHITECTURE.md § Layer model.
 */

export const BAND_IDS = ['sky', 'skyline', 'room', 'near'] as const

export type BandId = (typeof BAND_IDS)[number]

export type Band = {
  id: BandId
  /** Camera travel multiplier. 1.00 is the room plane the camera is clamped against. */
  factor: number
  /** Draw order, back to front. */
  z: number
}

export const BANDS: Record<BandId, Band> = {
  sky: { id: 'sky', factor: 0.1, z: 0 },
  skyline: { id: 'skyline', factor: 0.3, z: 10 },
  room: { id: 'room', factor: 1.0, z: 20 },
  near: { id: 'near', factor: 1.15, z: 30 },
}

/** Back-to-front, which is the order they must be added to the stage. */
export const BANDS_IN_DRAW_ORDER: readonly Band[] = BAND_IDS.map((id) => BANDS[id]).sort(
  (a, b) => a.z - b.z,
)
