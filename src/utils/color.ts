/**
 * Colour primitives shared across layers.
 *
 * Kept in `utils/` rather than beside the terrain compositor because both the rendering layer and the
 * data layer need to speak about colours, and `data/` may not depend on `scene/`.
 */

/** An 8-bit sRGB colour (channels in `[0, 255]`). */
export interface RgbColor {
  /** Red channel `[0, 255]`. */
  r: number
  /** Green channel `[0, 255]`. */
  g: number
  /** Blue channel `[0, 255]`. */
  b: number
}

/**
 * Convert HSL to 8-bit RGB.
 * @param hue - hue in degrees (wrapped into `[0, 360)`)
 * @param saturation - saturation `[0, 1]`
 * @param lightness - lightness `[0, 1]`
 * @returns the colour
 */
export function hslToRgb(hue: number, saturation: number, lightness: number): RgbColor {
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const h = (((hue % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((h % 2) - 1))
  const [r, g, b] =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x]
  const m = lightness - c / 2
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

/**
 * Parse a `#rrggbb` string into an {@link RgbColor}. Unparseable input falls back to mid-grey rather
 * than throwing: a colour picker should never be able to take the map down.
 * @param hex - the colour string, with or without a leading `#`
 * @returns the colour
 */
export function hexToRgb(hex: string): RgbColor {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match?.[1]) return { r: 128, g: 128, b: 128 }
  const value = Number.parseInt(match[1], 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}
