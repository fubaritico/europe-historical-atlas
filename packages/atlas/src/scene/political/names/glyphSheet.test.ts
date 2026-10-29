import { describe, expect, it, vi } from 'vitest'

import {
  HALO_FIELD_EM,
  SHEET_PAD,
  SHEET_PX_PER_EM,
  charactersOf,
  drawNameSheet,
  layoutSheet,
} from './glyphSheet'

/** The face's reach used throughout: three quarters of an em up, a quarter down. */
const REACH = { ascent: 0.75, descent: 0.25 }

/**
 * A canvas whose 2D context measures every character `width` pixels wide at the sheet's size.
 * @param width - each character's width, in pixels at the sheet's size
 * @param descent - how far each character reaches below its baseline, in ems
 * @returns the canvas, and the context's text writes
 */
function fakeCanvas(
  width: number,
  descent = 0.1
): {
  canvas: HTMLCanvasElement
  fillText: ReturnType<typeof vi.fn>
  written: () => Uint8ClampedArray | null
} {
  const fillText = vi.fn()
  let written: Uint8ClampedArray | null = null
  const canvas = { width: 0, height: 0, getContext: () => context }
  const context = {
    font: '',
    fillStyle: '',
    textBaseline: '',
    textAlign: '',
    measureText: () => ({
      width,
      actualBoundingBoxAscent: 0.7 * SHEET_PX_PER_EM,
      actualBoundingBoxDescent: descent * SHEET_PX_PER_EM,
      fontBoundingBoxAscent: REACH.ascent * SHEET_PX_PER_EM,
      fontBoundingBoxDescent: REACH.descent * SHEET_PX_PER_EM,
    }),
    fillText,
    // The letters as drawn: the first pixel of the sheet on a letter, every other off.
    getImageData: () => {
      const data = new Uint8ClampedArray(canvas.width * canvas.height * 4)
      data[3] = 255
      return { data }
    },
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (image: { data: Uint8ClampedArray }) => {
      written = image.data
    },
  }
  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    fillText,
    written: () => written,
  }
}

describe('charactersOf', () => {
  it('lists each character of the names once, in the order they first appear', () => {
    expect(charactersOf(['Aba', 'Ba c'])).toEqual(['A', 'b', 'a', 'B', ' ', 'c'])
  })
})

describe('layoutSheet', () => {
  describe('happy path', () => {
    it('lays the cells side by side, each its advance and two pads wide', () => {
      const { slots, rowHeight } = layoutSheet(
        new Map([
          ['A', 0.5],
          ['B', 0.25],
        ]),
        REACH
      )
      expect(rowHeight).toBe(SHEET_PX_PER_EM)
      expect(slots.get('A')).toEqual({
        x: 0,
        y: 0,
        width: Math.ceil((0.5 + 2 * SHEET_PAD) * SHEET_PX_PER_EM),
      })
      expect(slots.get('B')?.x).toBe(slots.get('A')?.width)
    })
  })

  describe('variants', () => {
    it('starts a new row when a cell would pass the widest row', () => {
      const wide = new Map(Array.from('ABCDEFGHIJKLMNOPQRST', (character) => [character, 1]))
      const { slots, height, rowHeight } = layoutSheet(wide, REACH)
      expect(height).toBeGreaterThan(rowHeight)
      expect([...slots.values()].some(({ y }) => y > 0)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('refuses a character wider than a row', () => {
      expect(() => layoutSheet(new Map([['W', 40]]), REACH)).toThrow(/wider than a sheet's row/)
    })
  })

  // L4: N/A — arithmetic over the measures it is given.

  describe('edge cases', () => {
    it('makes one empty row of a sheet with no character', () => {
      expect(layoutSheet(new Map(), REACH)).toMatchObject({ width: 0, height: SHEET_PX_PER_EM })
    })
  })
})

describe('drawNameSheet', () => {
  describe('happy path', () => {
    it('measures each character at a size of one, for the compute', () => {
      const { canvas } = fakeCanvas(SHEET_PX_PER_EM / 2)
      const { glyphs } = drawNameSheet(['A'], 'face', {
        letters: canvas,
        halo: fakeCanvas(1).canvas,
      })
      expect(glyphs.A).toEqual({
        advance: 0.5,
        ascent: 0.7,
        descent: expect.closeTo(0.1, 9) as number,
      })
    })

    it('writes each pixel’s distance to the nearest letter on the second sheet, laid out alike', () => {
      const letters = fakeCanvas(SHEET_PX_PER_EM / 2)
      const halo = fakeCanvas(SHEET_PX_PER_EM / 2)
      const { sheet } = drawNameSheet(['A'], 'face', { letters: letters.canvas, halo: halo.canvas })
      const field = halo.written()
      const reach = HALO_FIELD_EM * SHEET_PX_PER_EM
      expect([halo.canvas.width, sheet.halo]).toEqual([letters.canvas.width, halo.canvas])
      // On the letter, nothing away; a pixel along, a little; past the field's reach, all.
      expect([field?.[0], field?.[4], field?.[(Math.ceil(reach) + 1) * 4]]).toEqual([
        0,
        Math.round(255 / reach),
        255,
      ])
    })

    it('draws every character but the space, each in its own cell', () => {
      const { canvas, fillText } = fakeCanvas(SHEET_PX_PER_EM / 2)
      const { sheet } = drawNameSheet(['A', ' ', 'B'], 'face', {
        letters: canvas,
        halo: fakeCanvas(1).canvas,
      })
      expect(fillText.mock.calls.map(([character]) => character as string)).toEqual(['A', 'B'])
      expect([...sheet.cells.keys()]).toEqual(['A', 'B'])
      expect(sheet).toMatchObject(REACH)
    })
  })

  describe('variants', () => {
    it('makes every cell reach as far as the letter that reaches furthest past the face’s box', () => {
      const { canvas } = fakeCanvas(SHEET_PX_PER_EM / 2, 0.4)
      const { sheet } = drawNameSheet(['g'], 'face', {
        letters: canvas,
        halo: fakeCanvas(1).canvas,
      })
      expect(sheet).toMatchObject({ ascent: 0.75, descent: 0.4 })
    })

    it('sizes the canvas to the cells, and gives each cell its place on it', () => {
      const { canvas } = fakeCanvas(SHEET_PX_PER_EM / 2)
      const { sheet } = drawNameSheet(['A', 'B'], 'face', {
        letters: canvas,
        halo: fakeCanvas(1).canvas,
      })
      const a = sheet.cells.get('A')
      expect(canvas.width).toBeGreaterThan(0)
      expect(a).toMatchObject({ u0: 0, v0: 0, v1: 1, advance: 0.5 })
      expect(sheet.cells.get('B')?.u0).toBe(a?.u1)
    })
  })

  describe('managed errors', () => {
    it('refuses a canvas with no 2D context', () => {
      const canvas = { getContext: () => null } as unknown as HTMLCanvasElement
      expect(() =>
        drawNameSheet(['A'], 'face', { letters: canvas, halo: fakeCanvas(1).canvas })
      ).toThrow(/no 2D context/)
    })
  })

  // L4: N/A — the measures are the canvas's own.

  describe('edge cases', () => {
    it('draws nothing for names of spaces only, and keeps the space’s measure', () => {
      const { canvas, fillText } = fakeCanvas(SHEET_PX_PER_EM / 4)
      const { glyphs, sheet } = drawNameSheet([' '], 'face', {
        letters: canvas,
        halo: fakeCanvas(1).canvas,
      })
      expect(fillText).not.toHaveBeenCalled()
      expect(sheet.cells.size).toBe(0)
      expect(glyphs[' ']?.advance).toBe(0.25)
    })
  })
})
