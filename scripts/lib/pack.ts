/**
 * Sprite sheet packing.
 *
 * Shelf packing with frames sorted by height, descending. Not the tightest algorithm
 * available, but character animation frames are all roughly the same size, which is
 * the case shelf packing handles nearly optimally — and it is deterministic, so the
 * same input produces byte-identical sheets and the output does not churn in git on
 * every re-import.
 *
 * Sheets are capped at 2048 x 2048: universally supported, where larger sheets fail
 * on some mobile GPUs (docs/ANIMATION.md § Atlas constraints).
 */

export const MAX_SHEET = 2048

/** Transparent gutter between frames, to stop bilinear filtering bleeding neighbours in. */
export const PADDING = 2

export type PackInput = {
  index: number
  width: number
  height: number
}

export type PackedFrame = PackInput & {
  sheet: number
  x: number
  y: number
}

export type PackResult = {
  frames: PackedFrame[]
  /** Actual used size per sheet, which is what gets rendered. */
  sheets: { width: number; height: number }[]
}

/**
 * Pack frames into as few sheets as possible.
 *
 * Throws if a single frame cannot fit a sheet at all — that is a real authoring
 * error (a frame wider than 2048 after trimming) and silently downscaling it would
 * be worse than saying so.
 */
export function packFrames(inputs: readonly PackInput[]): PackResult {
  for (const input of inputs) {
    if (input.width + PADDING * 2 > MAX_SHEET || input.height + PADDING * 2 > MAX_SHEET) {
      throw new Error(
        `Frame ${input.index} is ${input.width}x${input.height}, which cannot fit a ` +
          `${MAX_SHEET}x${MAX_SHEET} sheet even alone. Export the character smaller.`,
      )
    }
  }

  // Tallest first. Shelf packing wastes the difference between the tallest frame on a
  // row and every other frame on it, so grouping similar heights together is the
  // whole trick.
  const order = [...inputs].sort((a, b) => b.height - a.height || a.index - b.index)

  const frames: PackedFrame[] = []
  const sheets: { width: number; height: number }[] = []

  let sheet = 0
  let cursorX = PADDING
  let cursorY = PADDING
  let rowHeight = 0
  let usedWidth = 0

  const closeSheet = () => {
    sheets[sheet] = {
      width: align(Math.min(MAX_SHEET, usedWidth + PADDING)),
      height: align(Math.min(MAX_SHEET, cursorY + rowHeight + PADDING)),
    }
  }

  for (const input of order) {
    const w = input.width + PADDING
    const h = input.height + PADDING

    // Row full: start a new shelf.
    if (cursorX + w > MAX_SHEET) {
      cursorX = PADDING
      cursorY += rowHeight
      rowHeight = 0
    }

    // Sheet full: close it and open the next.
    if (cursorY + h > MAX_SHEET) {
      closeSheet()
      sheet += 1
      cursorX = PADDING
      cursorY = PADDING
      rowHeight = 0
      usedWidth = 0
    }

    frames.push({ ...input, sheet, x: cursorX, y: cursorY })

    cursorX += w
    rowHeight = Math.max(rowHeight, h)
    usedWidth = Math.max(usedWidth, cursorX)
  }

  if (frames.length > 0) closeSheet()

  // Back to source order: the animation plays in frame order, not packing order.
  frames.sort((a, b) => a.index - b.index)

  return { frames, sheets }
}

/**
 * Round up to a multiple of four, not to a power of two.
 *
 * Power-of-two sheets are the usual convention, but they are the wrong trade here.
 * A sheet whose rows end at 1288px would round to 2048 and allocate a 2048 x 2048
 * RGBA texture — 16.8 MB of GPU memory, against 10.5 MB for the size actually used.
 * The PNG compresses the empty region to nothing, so the cost is invisible on disk
 * and entirely real in VRAM, which matters most on the mobile GPUs the 2048 cap
 * exists for.
 *
 * Power-of-two buys mipmapping and repeat wrapping. A sprite atlas uses neither: it
 * samples at one level with clamp-to-edge. WebGL2, which Pixi 8 targets, supports
 * non-power-of-two textures without restriction.
 */
function align(value: number): number {
  return Math.min(MAX_SHEET, Math.ceil(value / 4) * 4)
}
