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

/**
 * A route change in flight.
 *
 * A timestamp rather than a progress number, because both halves of the glitch run
 * off it independently: React animates the DOM overlay with Motion, the scene drives
 * its filter in the ticker, and neither waits on the other. Two clocks would drift
 * apart within a frame of each other and the effect only reads as one event if they
 * do not. See docs/ARCHITECTURE.md § The transition layer.
 */
export type Transition = {
  /** `performance.now()` at the moment the route changed. */
  startedAt: number
  /** Milliseconds. Both sides read this rather than each knowing the duration. */
  duration: number
}

export type SceneState = {
  /** Which hotspot the pointer is over, if any. Written by the scene. */
  hovered: HotspotId | null
  /** Which overlay panel is open, if any. Written by React, from the route. */
  overlay: HotspotId | null
  /** Non-null while a route change is glitching. Written by React. */
  transition: Transition | null
  /**
   * The slug of the post currently up on the billboard, if there is one. Written by
   * the carousel, read by the click handler that navigates.
   *
   * It is here because clicking the billboard goes to *that post* rather than to the
   * top of the News tab, and the two halves of that live on opposite sides of the
   * boundary: the carousel knows which slide is up, and the window-level click
   * listener in `components/scene/SceneCanvas.tsx` is what turns a hotspot into a
   * route. Passing the slug through here is the sanctioned way for them to meet.
   *
   * `null` is an ordinary state, not a failure: no WebGL and there is no carousel to
   * ask, and a post with no picture never reaches the billboard at all. The click
   * falls back to the plain `/updates` the hotspot already carries.
   */
  billboard: string | null
}

let state: SceneState = { hovered: null, overlay: null, transition: null, billboard: null }

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

export function setTransition(transition: Transition | null): void {
  if (state.transition === transition) return
  state = { ...state, transition }
  emit()
}

export function setBillboardPost(billboard: string | null): void {
  if (state.billboard === billboard) return
  state = { ...state, billboard }
  emit()
}


function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Server snapshot is the initial state: nothing hovered, nothing open, nothing moving. */
const SERVER_STATE: SceneState = {
  hovered: null,
  overlay: null,
  transition: null,
  billboard: null,
}

export function useSceneState(): SceneState {
  return useSyncExternalStore(subscribe, getSceneState, () => SERVER_STATE)
}
