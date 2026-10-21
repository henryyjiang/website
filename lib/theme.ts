/**
 * The palette, in one place, for both halves of the site.
 *
 * Every colour the DOM and the scene use comes from here. The DOM reads it as CSS
 * custom properties; Pixi reads the same values as numbers. One definition rather
 * than two, because a panel whose cyan is a few degrees off the cyan behind the
 * glass looks like a mistake and is impossible to find once it has been typed in
 * two places.
 *
 * **Roles, not colour names.** `active` rather than `cyan`, so swapping the palette
 * is editing this file and nothing else. A component that said `text-cyan-400` would
 * have to be found and rewritten for every experiment; a component that says
 * `var(--active)` does not care what the experiment is.
 *
 * Swapping is meant to be cheap and is expected to happen: see `PALETTES` below.
 */

/** The roles. Adding one means adding it to every palette — deliberately. */
export type Palette = {
  /** Shown in the switcher. */
  label: string
  /** Page ground, behind everything including the canvas. */
  ground: string
  /** Panel and pill fill. Sits one step off `ground` so edges read without a border. */
  panel: string
  /** Body copy. Must clear 4.5:1 on `ground` and on `panel`. */
  text: string
  /** Idle and secondary text. Deliberately dim — see docs/DESIGN.md § Chrome. */
  dim: string
  /** Brand accent. The "yellow" slot: focus rings, the current marker, rules. */
  primary: string
  /** Interactive and current. The "cyan" slot: links, hover, the active nav item. */
  active: string
  /** Emphasis and alarm. The "coral" slot: external links, the glitch flash. */
  alert: string
};

/**
 * Several palettes, one in use.
 *
 * `arasaka` is the one Henry picked on 2026-10-20, after comparing them in the page:
 * the reference's own yellow / cyan / red, which reads harder against the scene than
 * the softer hues measured out of the skyline. `signal` is those measured hues and
 * is kept because it is where the structure came from.
 *
 * They all keep the same three-role shape — one brand colour, one interactive
 * colour, one alarm colour — because that structure is what makes a cyberpunk
 * interface legible at a glance, and only the hues move.
 *
 * **Changing the theme is changing `DEFAULT_PALETTE` below, and nothing else.** No
 * component names a colour; every one of them resolves `var(--active)` and friends
 * at runtime (app/globals.css), and the scene reads the same values as numbers. A
 * new palette is seven hexes added to this object.
 */
export const PALETTES = {
  signal: {
    label: 'Signal — measured from the skyline',
    ground: '#05060E',
    panel: '#0A0C18',
    text: '#FFE5C2',
    dim: '#8A6F62',
    primary: '#FFFF67',
    active: '#67FFFF',
    alert: '#FF7F67',
  },
  arasaka: {
    label: 'Arasaka — the reference palette',
    ground: '#080E14',
    panel: '#0E1118',
    text: '#D8E4E8',
    dim: '#7E464E',
    primary: '#F9F31A',
    active: '#66F6F2',
    alert: '#FF003C',
  },
  sodium: {
    label: 'Sodium — amber and hot pink',
    ground: '#0B0710',
    panel: '#140C1A',
    text: '#FFE8D6',
    dim: '#7A5A6A',
    primary: '#FFA12B',
    active: '#FF4D9D',
    alert: '#FFE34D',
  },
  chlorine: {
    label: 'Chlorine — acid green and magenta',
    ground: '#05100B',
    panel: '#0A1711',
    text: '#DFFFE9',
    dim: '#5E7A68',
    primary: '#9DFF3C',
    active: '#FF3CC8',
    alert: '#3CFFE0',
  },
  monowire: {
    label: 'Monowire — near-monochrome',
    ground: '#07080A',
    panel: '#101216',
    text: '#E6EAF0',
    dim: '#5A6472',
    primary: '#FFFFFF',
    active: '#7DE3FF',
    alert: '#FF4B4B',
  },
} as const satisfies Record<string, Palette>

export type PaletteName = keyof typeof PALETTES

export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[]

export const DEFAULT_PALETTE: PaletteName = 'arasaka'

export function isPaletteName(value: string | null | undefined): value is PaletteName {
  return typeof value === 'string' && value in PALETTES
}

/** The roles a palette carries, minus the label. The keys that become CSS variables. */
const ROLES = ['ground', 'panel', 'text', 'dim', 'primary', 'active', 'alert'] as const

export type Role = (typeof ROLES)[number]

/**
 * `:root { --ground: …; }` for one palette.
 *
 * Rendered into a `<style>` by the root layout so the first paint is already themed.
 * Writing these as inline styles on `<body>` instead would work, but then the values
 * would not be visible to anything rendered in a portal or to the `::selection`
 * rule, both of which want the page root.
 */
export function paletteCss(name: PaletteName): string {
  const palette = PALETTES[name]
  const lines = ROLES.map((role) => `--${role}: ${palette[role]};`)
  return `:root{${lines.join('')}}`
}

/**
 * `#RRGGBB` as the number Pixi wants.
 *
 * The scene cannot read CSS variables — it is drawing into a canvas, not laying out
 * a document — so it takes the same palette through this instead. Parsed rather than
 * stored twice, so a hex typed above is the only place a colour is written.
 */
export function hex(value: string): number {
  return Number.parseInt(value.replace('#', ''), 16)
}

/**
 * The neons a billboard headline may be set in.
 *
 * A set rather than a role, and deliberately not part of `PALETTES`. A palette is
 * seven roles that answer "what is this element *for*" — ground, text, the
 * interactive colour. This answers a different question: what colour will still be
 * legible on top of a photograph nobody has seen yet. Its job is **coverage of the
 * hue circle**, so that whatever a post's image turns out to look like, something
 * here stands off it. A set that moved with the theme could leave a gap exactly
 * where the next image lands, which is the one thing it must not do.
 *
 * Three of the five are the current palette's own primary, active and alert, which
 * is not a coincidence — the palette was measured out of Henry's skyline and these
 * are the colours a neon city is lit with. Orange and magenta fill the two gaps
 * between them.
 *
 * Which one a given image gets is **measured at import**, not chosen here and not
 * decided per frame: `npm run art` scores every neon against the part of the image
 * the headline covers and bakes the winner into the manifest. See
 * `scripts/import-art.ts` § `pickHeadlineNeon`.
 */
export const HEADLINE_NEONS = [
  { id: 'yellow', hex: '#F9F31A' },
  { id: 'cyan', hex: '#66F6F2' },
  { id: 'red', hex: '#FF003C' },
  { id: 'orange', hex: '#FF7A1A' },
  { id: 'magenta', hex: '#FF3CC8' },
] as const satisfies readonly { id: string; hex: string }[]

export type HeadlineNeon = (typeof HEADLINE_NEONS)[number]['id']

/**
 * How far each neon is mixed toward white before the headline is set in it.
 *
 * The pure hues above are the colours a sign is lit in, and at full chroma over a
 * photograph they read as louder than the picture — the type stops being a caption
 * on the image and starts competing with it. A quarter of white pulls them back to
 * the register of something printed on the screen rather than glowing through it,
 * and keeps them clearly neon rather than pastel.
 *
 * One number, so the whole set moves together and the relationships between the
 * five are preserved. Raising it washes them out; dropping it to 0 gives the pure
 * hues back.
 */
export const HEADLINE_WHITE_MIX = 0.25

/**
 * `#RRGGBB` mixed toward white.
 *
 * **Hue survives this exactly, which is why the colour choice can ignore it.**
 * Tinting adds the same proportion of the gap to white to every channel, so the
 * differences between channels all shrink by the same factor `1 - amount` — and hue
 * is defined by the *ratios* of those differences, which are unchanged. Only chroma
 * drops. So `scripts/import-art.ts` can pick a neon by hue distance and tint it
 * afterwards without the tint moving the answer.
 */
export function tintToward(value: string, amount: number): string {
  const channel = (offset: number): string => {
    const raw = Number.parseInt(value.slice(offset, offset + 2), 16)
    return Math.round(raw + (255 - raw) * amount)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase()
}

/**
 * The colours a headline is actually set in: the neons above, tinted.
 *
 * Derived rather than written out, so the five listed hues stay the single place a
 * colour is named and the mix stays a single number. This is what the import scores
 * and bakes — scoring the untinted hue would measure a contrast the viewer never
 * sees, since tinting raises luminance.
 */
export const HEADLINE_COLOURS = HEADLINE_NEONS.map((neon) => ({
  id: neon.id,
  hex: tintToward(neon.hex, HEADLINE_WHITE_MIX),
}))

/** Every role of a palette, as numbers, for the scene. */
export function paletteNumbers(name: PaletteName): Record<Role, number> {
  const palette = PALETTES[name]
  return Object.fromEntries(ROLES.map((role) => [role, hex(palette[role])])) as Record<
    Role,
    number
  >
}
