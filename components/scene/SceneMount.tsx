'use client'

import dynamic from 'next/dynamic'

/**
 * The client boundary around the scene.
 *
 * Pixi touches `window` and WebGL at module scope, so `SceneCanvas` is loaded
 * through `next/dynamic` with `ssr: false`. `ssr: false` is only legal inside a
 * client component, which is the entire reason this file exists: the root layout is
 * a server component and renders this instead of importing the canvas directly.
 */
const SceneCanvas = dynamic(() => import('./SceneCanvas'), {
  ssr: false,
  // No skeleton. The scene is decoration behind the content, and a placeholder that
  // flashes and is replaced is worse than one frame of the page background.
  loading: () => null,
})

export function SceneMount() {
  return <SceneCanvas />
}
