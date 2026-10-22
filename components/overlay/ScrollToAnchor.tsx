'use client'

import { useEffect } from 'react'

/** How long the arrival marker stays lit before it fades. */
const MARK_MS = 2000

/**
 * Scroll the panel to the row named in the URL's hash, and say which one it is.
 *
 * The blog links into the Coding list by slug (`/desk#project-fwubbo`), and the
 * billboard links into the blog's own feed the same way (`/updates#post-<slug>`), so
 * arriving at the tab is only half of it — the reader has to land on the entry they
 * clicked, and then be told which of several similar-looking rows it was.
 *
 * It mounts on both of those tabs and reads the hash once, which is all either of
 * them needs: both arrivals are route changes that mount the panel. Changing only
 * the hash on a tab that is already open would not re-run this, and nothing on the
 * site does that — the scene's hotspots are unhoverable while a panel is open.
 *
 * Done here rather than left to the browser because the panel body is its own scroll
 * container inside a fixed layout, and because the arrival is a client-side route
 * change rather than a page load: the document never navigates, so there is no
 * moment at which a browser would resolve the fragment on its own.
 *
 * One frame is waited out first. The panel mounts, its heading takes focus for the
 * route change (`OverlayPanel`), and only then is there a laid-out row to scroll to;
 * measuring before that lands on the right element at the wrong offset. Focus is
 * then moved to the row, which is what makes this work for a keyboard or screen
 * reader rather than only for the eye — a parent's effect runs after a child's, so
 * doing it in the frame after is also what keeps the panel's own focus call from
 * undoing this one.
 */
export function ScrollToAnchor() {
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return

    const target = document.getElementById(id)
    if (!target) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let fade = 0

    const raf = requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
      target.focus({ preventScroll: true })
      target.setAttribute('data-arrived', 'true')
      // `false` rather than removed: the element has to keep matching the rule that
      // carries the transition or the marker vanishes in a frame (app/globals.css).
      fade = window.setTimeout(() => target.setAttribute('data-arrived', 'false'), MARK_MS)
    })

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(fade)
      target.removeAttribute('data-arrived')
    }
  }, [])

  return null
}
