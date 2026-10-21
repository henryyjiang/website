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

/** Every role of a palette, as numbers, for the scene. */
export function paletteNumbers(name: PaletteName): Record<Role, number> {
  const palette = PALETTES[name]
  return Object.fromEntries(ROLES.map((role) => [role, hex(palette[role])])) as Record<
    Role,
    number
  >
}
