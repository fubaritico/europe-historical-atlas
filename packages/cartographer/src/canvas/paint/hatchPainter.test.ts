import { describe, expect, it } from 'vitest'

import { paintHatches } from './hatchPainter'

import type { HatchCanvas, HatchLayout, HatchOnScreen } from './hatchPainter'

// CARTO-364 — the dev, 2026-11-06: an overlap hatched in the colour of each polity covering it, in turn.

/** One call the fake recorded, with the state it was made in. */
interface Call {
  op: string
  args: unknown[]
  fillStyle: unknown
  globalAlpha: number
  globalCompositeOperation: GlobalCompositeOperation
}

/**
 * A context that records what it is asked.
 * @returns the fake and its calls
 */
function recording(): { ctx: HatchCanvas; calls: Call[] } {
  const calls: Call[] = []
  const ctx: HatchCanvas = {
    fillStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    beginPath: () => {
      record('beginPath')
    },
    moveTo: (...args) => {
      record('moveTo', args)
    },
    lineTo: (...args) => {
      record('lineTo', args)
    },
    closePath: () => {
      record('closePath')
    },
    fill: () => {
      record('fill')
    },
    fillRect: (...args) => {
      record('fillRect', args)
    },
    drawImage: (...args) => {
      record('drawImage', args)
    },
    clip: (...args) => {
      record('clip', args)
    },
    save: () => {
      record('save')
    },
    restore: () => {
      record('restore')
    },
  }
  /**
   * Note one call.
   * @param op - its name
   * @param args - its arguments
   */
  function record(op: string, args: unknown[] = []): void {
    calls.push({
      op,
      args,
      fillStyle: ctx.fillStyle,
      globalAlpha: ctx.globalAlpha,
      globalCompositeOperation: ctx.globalCompositeOperation,
    })
  }
  return { ctx, calls }
}

/** A square piece, 20 pixels a side, covered by two polities. */
const SQUARE: HatchOnScreen = {
  rings: [
    [
      [10, 10],
      [30, 10],
      [30, 30],
      [10, 30],
    ],
  ],
  colours: ['#0000ff', '#ffff00'],
}

/** A relief image stand-in. */
const RELIEF = {} as CanvasImageSource

/**
 * A layout with whatever a test needs.
 * @param overrides - the parts the test cares about
 * @returns a complete layout
 */
function layout(overrides: Partial<HatchLayout> = {}): HatchLayout {
  return {
    background: '#efe6d2',
    ground: { image: RELIEF, rect: { x: 0, y: 0, width: 100, height: 100 } },
    groundAlpha: 1,
    blend: 'overlay',
    alpha: 0.8,
    width: 5,
    origin: [0, 0],
    size: { width: 100, height: 100 },
    ...overrides,
  }
}

/**
 * The colour of each stripe filled, in order.
 * @param calls - what was recorded
 * @returns one colour per fill of stripes
 */
function stripeFills(calls: Call[]): unknown[] {
  return calls
    .filter((call) => call.op === 'fill' && call.globalCompositeOperation === 'overlay')
    .map((call) => call.fillStyle)
}

const starts = (calls: Call[]): unknown[] =>
  calls.filter((call) => call.op === 'moveTo' && call.args[1] === 10).map((call) => call.args[0])

describe('paintHatches', () => {
  describe('happy path', () => {
    it('clips to the piece even-odd, lays the relief again, then each colour’s stripes', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [SQUARE], layout())

      const ops = calls.map((call) => call.op)
      expect(ops.indexOf('clip')).toBeLessThan(ops.indexOf('drawImage'))
      expect(calls.find((call) => call.op === 'clip')?.args).toEqual(['evenodd'])
      expect(stripeFills(calls)).toEqual(['#0000ff', '#ffff00'])
    })

    it('lays the stripes in the fills’ blend and at their opacity', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [SQUARE], layout({ alpha: 0.4 }))

      const stripe = calls.find((call) => call.op === 'fill')
      expect(stripe?.globalCompositeOperation).toBe('overlay')
      expect(stripe?.globalAlpha).toBe(0.4)
    })

    it('restores the context after each piece', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [SQUARE, SQUARE], layout())

      expect(calls.filter((call) => call.op === 'save')).toHaveLength(2)
      expect(calls.filter((call) => call.op === 'restore')).toHaveLength(2)
      expect(calls.at(-1)?.op).toBe('restore')
    })
  })

  describe('variants', () => {
    it('gives four polities four colours in turn', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [{ ...SQUARE, colours: ['#a00', '#0a0', '#00a', '#aa0'] }], layout())

      expect(stripeFills(calls)).toEqual(['#a00', '#0a0', '#00a', '#aa0'])
    })

    it('gives each colour every n-th stripe, counted from the origin', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [SQUARE], layout({ width: 10 }))

      // The box runs x + y from 20 to 60: stripes k = 2 … 6, so ranks 2, 4, 6 are the first colour's, 3, 5 the second's.
      // After the relief: the clip's own path is not a stripe.
      const relief = calls.findIndex((call) => call.op === 'drawImage')
      const firstFill = calls.findIndex((call) => call.op === 'fill')
      const firstStripes = calls.slice(relief, firstFill).filter((call) => call.op === 'moveTo')
      expect(firstStripes.map((call) => call.args[0])).toEqual([10, 30, 50])
    })

    it('carries the stripes with the map when the origin moves', () => {
      const still = recording()
      const panned = recording()
      paintHatches(still.ctx, [SQUARE], layout({ width: 10 }))
      paintHatches(panned.ctx, [SQUARE], layout({ width: 10, origin: [3, 0] }))

      expect(starts(panned.calls)).not.toEqual(starts(still.calls))
    })

    it('lays the vellum alone when the relief is not shown', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [SQUARE], layout({ ground: null }))

      expect(calls.some((call) => call.op === 'drawImage')).toBe(false)
      expect(calls.find((call) => call.op === 'fillRect')?.fillStyle).toBe('#efe6d2')
    })

    it('lays the relief again at its own opacity', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [SQUARE], layout({ groundAlpha: 0.5 }))

      expect(calls.find((call) => call.op === 'drawImage')?.globalAlpha).toBe(0.5)
    })
  })

  describe('managed errors', () => {
    it('draws nothing for a piece off the screen', () => {
      const { ctx, calls } = recording()
      const off: HatchOnScreen = {
        ...SQUARE,
        rings: [
          [
            [200, 200],
            [220, 200],
            [220, 220],
          ],
        ],
      }
      paintHatches(ctx, [off], layout())

      expect(calls).toEqual([])
    })
  })

  // L4: N/A — no async operation, nothing thrown: the context is a fake that records.

  describe('edge cases', () => {
    it('draws nothing when there is no overlap', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [], layout())

      expect(calls).toEqual([])
    })

    it('skips an empty ring and still clips to the others', () => {
      const { ctx, calls } = recording()
      paintHatches(ctx, [{ ...SQUARE, rings: [[], ...SQUARE.rings] }], layout())

      expect(calls.filter((call) => call.op === 'closePath').length).toBeGreaterThan(0)
      expect(stripeFills(calls)).toHaveLength(2)
    })
  })
})
