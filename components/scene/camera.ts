/**
 * The camera: a target the pointer writes, and a current position the ticker eases
 * toward it.
 *
 * The pointer handler does nothing but store coordinates. It never touches the
 * transform, so input cost is constant no matter how fast events arrive, and touch
 * or device orientation drop in later as alternative target sources.
 *
 * Smoothing lives here, in the ticker, and never in a CSS transition. The old site
 * wrote `wrapper.style.transform` on every mousemove while CSS had a transition on
 * `transform`, so each event restarted the previous interpolation and the two fought.
 * See docs/ARCHITECTURE.md § Camera.
 */

import { type Camera, pointerToCamera } from '@/lib/scene-space'

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

  /** When true the camera is pinned at centre and parallax is off. */
  reducedMotion = false

  /** Store the pointer, and nothing else. */
  setPointer(clientX: number, clientY: number, viewportW: number, viewportH: number): void {
    if (this.reducedMotion) return
    const next = pointerToCamera(clientX, clientY, viewportW, viewportH)
    this.target.x = next.x
    this.target.y = next.y
  }

  recentre(): void {
    this.target.x = 0
    this.target.y = 0
  }

  /** Snap both target and current to centre, with no travel. */
  jumpToCentre(): void {
    this.recentre()
    this.current.x = 0
    this.current.y = 0
  }

  /**
   * Exponential damping rather than a fixed fraction of the remaining distance, so
   * the feel is frame-rate independent: a 144 Hz and a 60 Hz display settle at the
   * same speed rather than the faster one arriving 2.4x sooner.
   */
  update(deltaSeconds: number): void {
    if (this.reducedMotion) {
      this.jumpToCentre()
      return
    }

    const dt = Math.min(MAX_DT, Math.max(0, deltaSeconds))
    const t = 1 - Math.exp(-SPRING * dt)

    this.current.x += (this.target.x - this.current.x) * t
    this.current.y += (this.target.y - this.current.y) * t
  }
}
