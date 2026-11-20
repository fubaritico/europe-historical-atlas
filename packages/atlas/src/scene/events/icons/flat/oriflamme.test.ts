import { describe, expect, it } from 'vitest'

import { EVENT_ICON_SVG_STYLE } from './eventIconSvg'
import { ORIFLAMME_DRAWING } from './oriflamme'

/** The drawing's shapes, all in its one group. */
const SHAPES = ORIFLAMME_DRAWING.groups.flatMap(({ shapes }) => shapes)

/**
 * The box a shape's points span: a path's points and control points, or a circle's own.
 * @param element - the shape's SVG element
 * @returns its least and greatest x and y
 */
function extentOf(element: string): { minX: number; maxX: number; minY: number; maxY: number } {
  const circle = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/.exec(element)
  if (circle) {
    const [cx, cy, r] = circle.slice(1).map(Number) as [number, number, number]
    return { minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r }
  }
  const numbers = (/ d="([^"]+)"/.exec(element)?.[1] ?? '').match(/[\d.]+/g)?.map(Number) ?? []
  const xs = numbers.filter((_, index) => index % 2 === 0)
  const ys = numbers.filter((_, index) => index % 2 === 1)
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

/**
 * The middle of a shape's extent, across.
 * @param box - the extent
 * @returns its middle x
 */
function middle(box?: { minX: number; maxX: number }): number {
  return box ? (box.minX + box.maxX) / 2 : Number.NaN
}

describe('ORIFLAMME_DRAWING', () => {
  describe('happy path', () => {
    it('is one dark silhouette in the swords’ 44 frame, with no outline', () => {
      expect(ORIFLAMME_DRAWING.viewBox).toEqual([0, 0, 44, 44])
      expect(ORIFLAMME_DRAWING.outlined).toBe(false)
      expect(SHAPES.every(({ colour }) => colour === 'silhouette')).toBe(true)
    })
  })

  describe('variants', () => {
    it('keeps every shape half a rim inside the frame, so its rim is not cut', () => {
      // The dev, 2026-11-20, of the first « H », drawn to the frame's edge: "cut at the top and the bottom".
      const margin = EVENT_ICON_SVG_STYLE.rimWidth / 2
      const [, , width, height] = ORIFLAMME_DRAWING.viewBox
      for (const { element } of SHAPES) {
        const { minX, maxX, minY, maxY } = extentOf(element)
        expect(minX).toBeGreaterThanOrEqual(margin)
        expect(minY).toBeGreaterThanOrEqual(margin)
        expect(maxX).toBeLessThanOrEqual(width - margin)
        expect(maxY).toBeLessThanOrEqual(height - margin)
      }
    })

    it('stands the staff on a foot of two steps, the lower one wider', () => {
      const [staff, , , upper, lower] = SHAPES.map(({ element }) => extentOf(element))
      expect(upper && lower && lower.maxX - lower.minX > upper.maxX - upper.minX).toBe(true)
      expect(upper && staff && upper.maxX - upper.minX > staff.maxX - staff.minX).toBe(true)
      // The staff comes down into the upper step, the upper step sits on the lower.
      expect(staff?.maxY).toBeGreaterThanOrEqual(upper?.minY ?? Number.NaN)
      expect(upper?.maxY).toBe(lower?.minY)
    })

    it('is planted by the middle of its staff, which is the middle of its foot', () => {
      const [staff, , , upper, lower] = SHAPES.map(({ element }) => extentOf(element))
      expect(ORIFLAMME_DRAWING.standsAt).toBe(middle(staff))
      expect(middle(upper)).toBe(middle(staff))
      expect(middle(lower)).toBe(middle(staff))
    })

    it('flies the cloth from the staff to the frame’s right, clear of the foot', () => {
      const [staff, , cloth, upper] = SHAPES.map(({ element }) => extentOf(element))
      expect(cloth?.minX).toBe(staff?.maxX)
      expect(cloth?.maxX).toBe(42)
      expect(cloth?.maxY).toBeLessThan(upper?.minY ?? Number.NaN)
    })
  })

  // L3: N/A — a constant: nothing is refused
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('forks the cloth: its notch comes back inside from the two points', () => {
      const cloth = SHAPES[2]?.element ?? ''
      expect(cloth).toContain('42 7 L34.5 15 L42 23')
    })
  })
})
