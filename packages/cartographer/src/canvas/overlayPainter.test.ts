import { describe, expect, it } from 'vitest'

import { paintOverlay } from './overlayPainter'
import { CHROME_PAINT_STYLE } from './style'

import type { Painter2D } from './painter'
import type { OverlayScene } from './toolSession'

/** One recorded call, with the fill at the time — what tells a solid handle from a white one. */
interface Call {
  /** The member called. */
  op: string
  /** Its arguments. */
  args: unknown[]
  /** The fill colour when it was called. */
  fillStyle: unknown
}

/**
 * A context that records what it is asked to do.
 * @returns the context and its record
 */
function recording(): { ctx: Painter2D; calls: Call[] } {
  const calls: Call[] = []
  const state = { fillStyle: '' as unknown }
  const ctx = new Proxy(
    {},
    {
      get: (_, op: string) =>
        op === 'fillStyle'
          ? state.fillStyle
          : (...args: unknown[]) => {
              calls.push({ op, args, fillStyle: state.fillStyle })
            },
      set: (_, key: string, value: unknown) => {
        if (key === 'fillStyle') state.fillStyle = value
        return true
      },
    }
  ) as Painter2D
  return { ctx, calls }
}

const SIZE = { width: 400, height: 300 }

/** An empty overlay: nothing in progress. */
const NOTHING: OverlayScene = {
  outline: [],
  rubberTo: null,
  closing: false,
  moving: [],
  snapTarget: null,
  snapPreview: null,
  marquee: null,
  replaced: null,
}

/** The fill of each handle drawn, in order. */
function handleFills(calls: Call[]): unknown[] {
  return calls
    .filter((call) => call.op === 'arc')
    .map((call) => calls[calls.indexOf(call) + 1]?.fillStyle)
}

describe('paintOverlay', () => {
  describe('happy path', () => {
    // s02 — "the eleventh anchor is drawn solid … the ten before it are drawn white".
    it('draws the last anchor solid and the earlier ones white', () => {
      const { ctx, calls } = recording()
      paintOverlay(
        ctx,
        SIZE,
        {
          ...NOTHING,
          outline: [
            [1, 1],
            [2, 2],
            [3, 3],
          ],
        },
        CHROME_PAINT_STYLE
      )
      const { anchorFill, anchorStroke } = CHROME_PAINT_STYLE
      expect(handleFills(calls)).toEqual([anchorFill, anchorFill, anchorStroke])
    })
  })

  describe('variants', () => {
    it('runs the rubber band on to the pointer', () => {
      const { ctx, calls } = recording()
      paintOverlay(
        ctx,
        SIZE,
        { ...NOTHING, outline: [[1, 1]], rubberTo: [9, 9] },
        CHROME_PAINT_STYLE
      )
      expect(calls.find((call) => call.op === 'lineTo')?.args).toEqual([9, 9])
    })

    // s02 — "that anchor is emphasised" when the pointer can close the ring.
    it('fills the first anchor too while closing is offered', () => {
      const { ctx, calls } = recording()
      paintOverlay(
        ctx,
        SIZE,
        {
          ...NOTHING,
          outline: [
            [1, 1],
            [2, 2],
            [3, 3],
          ],
          closing: true,
        },
        CHROME_PAINT_STYLE
      )
      expect(handleFills(calls)[0]).toBe(CHROME_PAINT_STYLE.anchorStroke)
    })

    it('draws a dragged anchor with a stretch to each neighbour', () => {
      const { ctx, calls } = recording()
      paintOverlay(
        ctx,
        SIZE,
        {
          ...NOTHING,
          moving: [
            {
              at: [5, 5],
              from: [
                [0, 0],
                [10, 0],
              ],
            },
          ],
        },
        CHROME_PAINT_STYLE
      )
      expect(calls.filter((call) => call.op === 'lineTo').map((call) => call.args)).toEqual([
        [5, 5],
        [5, 5],
      ])
    })
  })

  describe('managed errors', () => {
    // L3: N/A — the painter decides nothing and refuses nothing; an empty scene is its resting state.
    it('only clears when nothing is in progress', () => {
      const { ctx, calls } = recording()
      paintOverlay(ctx, SIZE, NOTHING, CHROME_PAINT_STYLE)
      expect(calls.map((call) => call.op)).toEqual(['clearRect'])
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — no async work and no input it could fail on; positions arrive already projected.
    it('clears the whole canvas first, so no frame of the last gesture is left behind', () => {
      const { ctx, calls } = recording()
      paintOverlay(ctx, SIZE, { ...NOTHING, outline: [[1, 1]] }, CHROME_PAINT_STYLE)
      expect(calls[0]).toMatchObject({ op: 'clearRect', args: [0, 0, 400, 300] })
    })
  })

  describe('edge cases', () => {
    it('draws one solid handle for an outline of one anchor', () => {
      const { ctx, calls } = recording()
      paintOverlay(ctx, SIZE, { ...NOTHING, outline: [[1, 1]] }, CHROME_PAINT_STYLE)
      expect(handleFills(calls)).toEqual([CHROME_PAINT_STYLE.anchorStroke])
    })
  })

  describe('the coast offer', () => {
    // QUAL-107: the preview is stroked at twice the outline's weight, and the weight put back after.
    it('strokes the preview at three times the weight, then restores it, and fills the target', () => {
      const widths: number[] = []
      const { ctx, calls } = recording()
      const watched = new Proxy(ctx, {
        set: (target, key, value: unknown) => {
          if (key === 'lineWidth' && typeof value === 'number') widths.push(value)
          return Reflect.set(target, key, value)
        },
      })
      paintOverlay(
        watched,
        SIZE,
        {
          ...NOTHING,
          snapPreview: [
            [0, 0],
            [10, 0],
          ],
          snapTarget: [10, 0],
        },
        CHROME_PAINT_STYLE
      )
      expect(widths).toEqual([
        CHROME_PAINT_STYLE.pathWidth,
        CHROME_PAINT_STYLE.pathWidth * 3,
        CHROME_PAINT_STYLE.pathWidth,
      ])
      expect(handleFills(calls)).toEqual([CHROME_PAINT_STYLE.anchorStroke])
    })

    it('draws nothing of the coast when nothing is offered', () => {
      const { ctx, calls } = recording()
      paintOverlay(ctx, SIZE, NOTHING, CHROME_PAINT_STYLE)
      expect(calls.filter((call) => call.op === 'lineTo')).toEqual([])
    })
  })
})

describe('paintOverlay — ⟨retrace⟩ (H-46)', () => {
  it('draws the stretch a retrace would replace dashed, then puts the dash away', () => {
    const { ctx, calls } = recording()
    const replaced: [number, number][] = [
      [10, 10],
      [20, 30],
      [40, 30],
    ]
    paintOverlay(ctx, SIZE, { ...NOTHING, replaced }, CHROME_PAINT_STYLE)
    const dashes = calls.filter((call) => call.op === 'setLineDash').map((call) => call.args[0])
    expect(dashes).toEqual([[8, 6], []])
    expect(calls.filter((call) => call.op === 'lineTo').map((call) => call.args)).toEqual([
      [20, 30],
      [40, 30],
    ])
  })

  it('sets no dash when no stretch would be replaced', () => {
    const { ctx, calls } = recording()
    paintOverlay(ctx, SIZE, NOTHING, CHROME_PAINT_STYLE)
    expect(calls.some((call) => call.op === 'setLineDash')).toBe(false)
  })
})
