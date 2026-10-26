import { Color, DataTexture, RGBAFormat, SRGBColorSpace } from 'three'

/** The halo's look: a soft light disc behind an icon, to detach its strong colours from the map (the dev, 2026-10-26). */
export interface IconHaloStyle {
  /** Its colour — light. */
  colour: string
  /** How opaque it is at its middle, 0 to 1. */
  peak: number
  /** The texture's side, in pixels. */
  size: number
}

/** The default halo: parchment white, soft; strengthened on sight from a peak of 0.75 (the dev, 2026-10-26). */
export const ICON_HALO_STYLE: IconHaloStyle = { colour: '#fff8e8', peak: 0.95, size: 64 }

/**
 * How opaque the halo is at a distance from its middle: full at the middle, fading to nothing at the edge, eased so
 * it reads as a glow rather than a disc.
 * @param distance - from the middle, 0 to 1 at the edge
 * @param peak - the opacity at the middle
 * @returns the opacity, 0 to `peak`
 */
export function haloAlpha(distance: number, peak: number): number {
  const fade = Math.max(0, 1 - distance)
  return peak * fade * fade
}

/**
 * The halo's texture, computed pixel by pixel — no canvas, no file, so it is built the same in a test as on the map.
 * @param style - its colour, opacity and size
 * @returns the texture, for a sprite
 */
export function createHaloTexture(style: IconHaloStyle = ICON_HALO_STYLE): DataTexture {
  const { size } = style
  // `getHex` answers in sRGB, the texture's space; `Color.r` would be the linear working value, a darker halo.
  const hex = new Color(style.colour).getHex()
  const [r, g, b] = [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff]
  const pixels = new Uint8Array(size * size * 4)
  const half = size / 2
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x + 0.5 - half, y + 0.5 - half) / half
      const at = (y * size + x) * 4
      pixels[at] = r
      pixels[at + 1] = g
      pixels[at + 2] = b
      pixels[at + 3] = Math.round(haloAlpha(distance, style.peak) * 255)
    }
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat)
  texture.colorSpace = SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
