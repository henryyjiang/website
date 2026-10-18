'use client'

import { extend } from '@pixi/react'
import { Container, Text } from 'pixi.js'
import { useEffect, useState } from 'react'

import { BILLBOARD_TEXT_AREA } from '@/lib/scene-layout'
import { BILLBOARD_COUNT, UPDATES } from '@/content/updates'
import { byDateDesc } from '@/content/types'

extend({ Container, Text })

/** How long each headline holds before the next one. */
const DWELL_MS = 4500

const AREA = BILLBOARD_TEXT_AREA

/**
 * The billboard's live surface.
 *
 * The headline is drawn here rather than painted into the billboard art, so posting
 * an update never means re-exporting a PNG. It reads from content/updates.ts — the
 * same source /updates lists — which is the point: the carousel and the changelog
 * are two views of one list, never two copies of it (docs/CONTENT.md).
 *
 * Text lives in the canvas because it has to parallax with the skyline; it is
 * decorative duplication of the /updates page, which is the accessible copy.
 */
export function BillboardText({ reducedMotion }: { reducedMotion: boolean }) {
  const recent = byDateDesc(UPDATES).slice(0, BILLBOARD_COUNT)
  const [index, setIndex] = useState(0)

  // Not on the ticker: this changes every few seconds, not every frame, and a
  // setInterval that React owns is the honest way to express that. The ticker is for
  // things that move.
  useEffect(() => {
    if (reducedMotion || recent.length <= 1) return

    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % recent.length)
    }, DWELL_MS)

    return () => clearInterval(timer)
  }, [reducedMotion, recent.length])

  const update = recent[reducedMotion ? 0 : index % recent.length]
  if (!update) return null

  return (
    <pixiContainer label="billboard-text" x={AREA.x} y={AREA.y}>
      <pixiText
        text={update.title.toUpperCase()}
        x={AREA.width / 2}
        y={AREA.height / 2}
        anchor={0.5}
        resolution={2}
        style={{
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: 38,
          fontWeight: '700',
          fill: 0xfff4d6,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: AREA.width,
          lineHeight: 44,
          letterSpacing: 1,
        }}
      />
    </pixiContainer>
  )
}
