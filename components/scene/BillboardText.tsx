'use client'

import { extend } from '@pixi/react'
import { Container, Text } from 'pixi.js'
import { useEffect, useState } from 'react'

import type { ManifestRect } from '@/lib/scene-manifest'
import { BILLBOARD_COUNT, UPDATES } from '@/content/updates'
import { byDateDesc } from '@/content/types'

extend({ Container, Text })

/** How long each headline holds before the next one. */
const DWELL_MS = 4500

/**
 * Inset from the billboard's largest solid rectangle to the text's own box.
 *
 * The surface is drawn in perspective, so its inner rect touches the sloping top and
 * bottom edges at exactly one point each. A margin keeps the headline off that
 * pinch, and being a fraction rather than a pixel count it survives the billboard
 * being redrawn at a different size.
 */
const INSET = 0.08

/** Type size as a fraction of the panel height, so the headline scales with the art. */
const TEXT_SCALE = 0.13

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
export function BillboardText({
  area,
  reducedMotion,
}: {
  /** The billboard's measured inner rect, straight from the manifest. */
  area: ManifestRect
  reducedMotion: boolean
}) {
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
  if (!update || area.width <= 0 || area.height <= 0) return null

  const panel = {
    x: area.x + area.width * INSET,
    y: area.y + area.height * INSET,
    width: area.width * (1 - INSET * 2),
    height: area.height * (1 - INSET * 2),
  }
  const fontSize = Math.round(panel.height * TEXT_SCALE)

  return (
    <pixiContainer label="billboard-text" x={panel.x} y={panel.y}>
      <pixiText
        text={update.title.toUpperCase()}
        x={panel.width / 2}
        y={panel.height / 2}
        anchor={0.5}
        resolution={2}
        style={{
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize,
          fontWeight: '700',
          fill: 0x2b2118,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: panel.width,
          lineHeight: Math.round(fontSize * 1.18),
          letterSpacing: 1,
        }}
      />
    </pixiContainer>
  )
}
