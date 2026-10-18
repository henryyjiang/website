/**
 * The camera: a target an input writes, and a current position the ticker eases
 * toward it.
 *
 * Two inputs write that target, and which one depends on what the device has. A
 * pointer sets it from where the pointer is, so the room leans toward whatever is
 * being looked at. A finger sets it by dragging, because a phone has no "where the
 * pointer is" — only where it has been moved to — and because on a screen that can
 * see a quarter of the room at a time, moving across the room is the point rather
 * than a flourish.
 *
 * Neither handler touches the transform. They store a number and return, so input
 * costs the same no matter how fast events arrive.
 *
 * Smoothing lives here, in the ticker, and never in a CSS transition. The old site
 * wrote `wrapper.style.transform` on every mousemove while CSS had a transition on
 * `transform`, so each event restarted the previous interpolation and the two fought.
 * See docs/ARCHITECTURE.md § Camera.
 */

import { type Camera, pointerToCamera } from '@/lib/scene-space'

function clampUnit(value: number): number {
  return Math.min(1, Math.max(-1, value))
}

/**
 * Damping rate, per second. Higher is snappier. The camera closes
 * `1 - e^-SPRING` of the remaining distance each second.
 */
export const SPRING = 6

/**
 * Longest step the integrator will take, in seconds. Pixi already caps its own
 * elapsed time, and exponential damping cannot overshoot however large `dt` gets —
 * it just arrives — but clamping keeps the two independent.
 */
const MAX_DT = 0.1

export class CameraRig {
  readonly current: Camera = { x: 0, y: 0 }
  readonly target: Camera = { x: 0, y: 0 }

  /**
   * Where the camera rests when nothing is driving it.
   *
   * Centre on a pointer device. On a phone it is the focal framing, so "the scene
   * opens on the window" and "the pointer has left the window, go back" are the
   * same mechanism rather than two.
   */
  readonly home: Camera = { x: 0, y: 0 }

  /** When true the camera does not move on its own, and never eases. */
  reducedMotion = false

  private dragging = false

  /** Store the pointer, and nothing else. */
  setPointer(clientX: number, clientY: number, viewportW: number, viewportH: number): void {
    if (this.reducedMotion || this.dragging) return
    const next = pointerToCamera(clientX, clientY, viewportW, viewportH)
    this.target.x = next.x
    this.target.y = next.y
  }

  setHome(x: number, y: number): void {
    this.home.x = x
    this.home.y = y
  }

  /** A finger went down: stop easing anywhere else and follow it. */
  startDrag(): void {
    this.dragging = true
    this.target.x = this.current.x
    this.target.y = this.current.y
  }

  /**
   * Move by a screen distance, in the direction the finger went.
   *
   * `pixelsPerUnit` is how many screen pixels one unit of camera travel is worth,
   * which the caller gets from the transform — the rig stays unaware of scale and
   * viewport, as it is for every other input.
   *
   * Target and current move together: a drag is not something to ease toward,
   * because easing under a finger reads as the scene lagging behind the hand.
   */
  dragBy(deltaX: number, deltaY: number, pixelsPerUnitX: number, pixelsPerUnitY: number): void {
    if (!this.dragging) return

    if (pixelsPerUnitX > 0) this.target.x = clampUnit(this.target.x - deltaX / pixelsPerUnitX)
    if (pixelsPerUnitY > 0) this.target.y = clampUnit(this.target.y - deltaY / pixelsPerUnitY)

    this.current.x = this.target.x
    this.current.y = this.target.y
  }

  /**
   * The finger lifted. The camera stays where it was left: no spring back, because
   * the room is a place to be moved through here rather than a thing that leans,
   * and no momentum, because flinging past where you let go is a behaviour to add
   * deliberately once there is real art to judge it against.
   */
  endDrag(): void {
    this.dragging = false
  }

  get isDragging(): boolean {
    return this.dragging
  }

  /** Ease back to wherever the camera rests. */
  recentre(): void {
    if (this.dragging) return
    this.target.x = this.home.x
    this.target.y = this.home.y
  }

  /** Snap both target and current home, with no travel. */
  jumpHome(): void {
    this.dragging = false
    this.target.x = this.home.x
    this.target.y = this.home.y
    this.current.x = this.home.x
    this.current.y = this.home.y
  }

  /**
   * Exponential damping rather than a fixed fraction of the remaining distance, so
   * the feel is frame-rate independent: a 144 Hz and a 60 Hz display settle at the
   * same speed rather than the faster one arriving 2.4x sooner.
   */
  update(deltaSeconds: number): void {
    // Reduced motion means the camera does not drift on its own; a drag is the
    // reader moving it, which is not drift. So the target is honoured either way
    // and only the easing is dropped, rather than pinning the camera and leaving a
    // phone unable to see the rest of the room.
    if (this.reducedMotion || this.dragging) {
      this.current.x = this.target.x
      this.current.y = this.target.y
      return
    }

    const dt = Math.min(MAX_DT, Math.max(0, deltaSeconds))
    const t = 1 - Math.exp(-SPRING * dt)

    this.current.x += (this.target.x - this.current.x) * t
    this.current.y += (this.target.y - this.current.y) * t
  }
}
