import { ImageResponse } from 'next/og'

import { DEFAULT_PALETTE, PALETTES } from '@/lib/theme'

/**
 * The favicon: the skyline, four bars tall.
 *
 * Generated rather than drawn so that it reads the palette like everything else —
 * swapping `DEFAULT_PALETTE` moves the tab icon with the rest of the site, which a
 * committed `.ico` could not do (lib/theme.ts). Next runs this at build time and
 * serves the result; nothing renders it per request.
 *
 * Pure geometry, no text. At the 16 CSS pixels a tab actually gives it, a letterform
 * is three or four dark smudges and a monogram is unreadable, but a silhouette with
 * one lit tower still parses — and it is the same thing the site is a picture of.
 * It also avoids shipping a font to render two glyphs.
 */

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/**
 * The towers, left to right, in px of the 32px tile.
 *
 * **Irregular on purpose, in both axes.** Four bars of one width at one spacing is a
 * bar chart no matter what heights they are given — the eye reads evenly pitched
 * columns as data. Varying the widths is what makes the same four rectangles read as
 * buildings, and it costs nothing.
 *
 * 5 + 4 + 8 + 5 of bar and three 2px gaps is 28, inside 2px of margin: exactly 32, so
 * the skyline sits flush in the tile at the size it was designed for instead of
 * being resampled onto it.
 */
const TOWERS = [
  { width: 5, height: 13, lit: false },
  { width: 4, height: 21, lit: false },
  { width: 8, height: 28, lit: true },
  { width: 5, height: 16, lit: false },
]

export default function Icon() {
  const palette = PALETTES[DEFAULT_PALETTE]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          padding: 2,
          background: palette.ground,
        }}
      >
        {TOWERS.map((tower, index) => (
          <div
            key={index}
            style={{
              width: tower.width,
              height: tower.height,
              // Explicit margins rather than `gap`, which Satori supports unevenly.
              marginLeft: index === 0 ? 0 : 2,
              // The lit tower is the brand colour at full strength; the rest are the
              // interactive cyan held back, so one building reads as the subject.
              background: tower.lit ? palette.primary : palette.active,
              opacity: tower.lit ? 1 : 0.55,
            }}
          />
        ))}
      </div>
    ),
    size,
  )
}
