'use client'

/**
 * The channel between Pixi and React.
 *
 * Pixi owns the canvas; React owns the DOM. They do not reach into each other —
 * everything they need to share passes through here (docs/ARCHITECTURE.md § The
 * Pixi / React boundary).
 *
 * Deliberately not a React context or a state library: the scene writes `hovered`
 * from inside the ticker, and routing a per-frame value through React's render cycle
 * would re-render the tree for something only a filter needs to know. A plain
 * subscribable store lets each side read at its own cadence — React through
 * `useSyncExternalStore`, Pixi by reading `getSceneState()` on the tick.
 */

import { useSyncExternalStore } from 'react'

export type HotspotId = 'desk' | 'bed' | 'billboard'

export type SceneState = {
  /** Which hotspot the pointer is over, if any. Written by the scene. */
  hovered: HotspotId | null
  /** Which overlay panel is open, if any. Written by React, from the route. */
  overlay: HotspotId | null
}

let state: SceneState = { hovered: null, overlay: null }

const listeners = new Set<() => void>()

export function getSceneState(): SceneState {
  return state
}

function emit(): void {
  for (const listener of listeners) listener()
}

export function setHovered(hovered: HotspotId | null): void {
  if (state.hovered === hovered) return
  state = { ...state, hovered }
  emit()
}

export function setOverlay(overlay: HotspotId | null): void {
  if (state.overlay === overlay) return
  state = { ...state, overlay }
  emit()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Server snapshot is the initial state: nothing hovered, nothing open. */
const SERVER_STATE: SceneState = { hovered: null, overlay: null }

export function useSceneState(): SceneState {
  return useSyncExternalStore(subscribe, getSceneState, () => SERVER_STATE)
}
