import { SRGBColorSpace } from 'three'
import { describe, expect, it } from 'vitest'

import { ICON_HALO_STYLE, createHaloTexture, haloAlpha } from './halo'

/**
 * One pixel's RGBA.
 * @param data - the texture's pixels
 * @param size - its side
 * @param x - column
 * @param y - row
 * @returns the four channels
 */
function pixel(data: Uint8Array, size: number, x: number, y: number): number[] {
  const at = (y * size + x) * 4
  return Array.from(data.slice(at, at + 4))
}

describe('haloAlpha', () => {
  it('is the peak at the middle and nothing at the edge', () => {
    expect(haloAlpha(0, 0.75)).toBeCloseTo(0.75)
    expect(haloAlpha(1, 0.75)).toBe(0)
  })

  it('fades faster than a straight line, so it reads as a glow', () => {
    expect(haloAlpha(0.5, 1)).toBeLessThan(0.5)
  })

  it('is nothing past the edge', () => {
    expect(haloAlpha(1.4, 1)).toBe(0)
  })
})

describe('createHaloTexture', () => {
  it('paints the halo’s colour, in sRGB, opaque at the middle and clear in the corners', () => {
    const texture = createHaloTexture({ colour: '#ff8000', peak: 1, size: 16 })
    const data = texture.image.data as Uint8Array
    const middle = pixel(data, 16, 8, 8)
    expect(middle.slice(0, 3)).toEqual([255, 128, 0])
    expect(middle[3]).toBeGreaterThan(200)
    expect(pixel(data, 16, 0, 0)[3]).toBe(0)
    expect(texture.colorSpace).toBe(SRGBColorSpace)
  })

  it('is the default size when no style is given', () => {
    expect(createHaloTexture().image.width).toBe(ICON_HALO_STYLE.size)
  })
})
