import { describe, expect, it } from 'vitest'

import { paintCanvas } from './painter'

import type { CanvasScene, PaintStyle, Painter2D } from './painter'
import type { PixelSize, Point } from '../view/viewport'

/** One call the fake recorded: what was asked for, and the state the context was in. */
interface Call {
  /** The member called. */
  op: string
  /** Its arguments — the backdrop passes an image source among them. */
  args: (number | string | CanvasImageSource)[]
  /** The fill colour at the time. */
  fillStyle: string | CanvasGradient | CanvasPattern
  /** The stroke colour at the time. */
  strokeStyle: string | CanvasGradient | CanvasPattern
  /** The stroke width at the time. */
  lineWidth: number
}

/**
 * A context that records instead of drawing.
 *
 * jsdom has no 2D context, so this is what makes the painter testable at all — and it is why the painter
 * declares the members it needs structurally rather than taking `CanvasRenderingContext2D`.
 * @returns the fake and the calls it collects
 */
function recordingContext(): { ctx: Painter2D; calls: Call[] } {
  const calls: Call[] = []
  const state: {
    fillStyle: string | CanvasGradient | CanvasPattern
    strokeStyle: string | CanvasGradient | CanvasPattern
    lineWidth: number
    font: string
  } = { fillStyle: '', strokeStyle: '', lineWidth: 0, font: '' }
  const record =
    (op: string) =>
    (...args: (number | string | CanvasImageSource)[]): void => {
      calls.push({
        op,
        args,
        fillStyle: state.fillStyle,
        strokeStyle: state.strokeStyle,
        lineWidth: state.lineWidth,
      })
    }
  const ctx: Painter2D = {
    clearRect: record('clearRect'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    closePath: record('closePath'),
    arc: record('arc'),
    stroke: record('stroke'),
    fill: record('fill'),
    fillText: record('fillText'),
    drawImage: record('drawImage'),
    get fillStyle(): string | CanvasGradient | CanvasPattern {
      return state.fillStyle
    },
    set fillStyle(value: string | CanvasGradient | CanvasPattern) {
      state.fillStyle = value
    },
    get strokeStyle(): string | CanvasGradient | CanvasPattern {
      return state.strokeStyle
    },
    set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
      state.strokeStyle = value
    },
    get lineWidth(): number {
      return state.lineWidth
    },
    set lineWidth(value: number) {
      state.lineWidth = value
    },
    get font(): string {
      return state.font
    },
    set font(value: string) {
      state.font = value
    },
  }
  return { ctx, calls }
}

/** The design's values, from `design/chrome.css`. */
const STYLE: PaintStyle = {
  background: '#d9ccad',
  zoneStroke: 'rgba(42, 38, 31, 0.5)',
  zoneLabel: '#4a4238',
  labelFont: '11px sans-serif',
  pathStroke: '#5b93d6',
  pathWidth: 1,
  anchorFill: '#ffffff',
  anchorStroke: '#5b93d6',
  anchorRadius: 4,
}

const SIZE: PixelSize = { width: 800, height: 600 }

/** Two anchors of a square, enough for a ring and for handles. */
const SQUARE: Point[] = [
  [100, 100],
  [200, 100],
  [200, 200],
  [100, 200],
]

/**
 * A scene with whatever a test needs.
 * @param overrides - the parts this test cares about
 * @returns a complete scene
 */
function scene(overrides: Partial<CanvasScene> = {}): CanvasScene {
  return {
    backdrop: null,
    editorialZone: { x: 50, y: 60, width: 400, height: 300 },
    zoneLabel: 'editorial zone',
    rings: [],
    anchors: [],
    selected: new Set<number>(),
    ...overrides,
  }
}

/** The ops a painted scene performed, in order. */
function ops(calls: Call[]): string[] {
  return calls.map((call) => call.op)
}

describe('painter', () => {
  describe('happy path', () => {
    it('clears, then lays the background over the whole canvas', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene(), STYLE)

      expect(calls[0]?.op).toBe('clearRect')
      expect(calls[0]?.args).toEqual([0, 0, 800, 600])
      expect(calls[1]?.op).toBe('fillRect')
      expect(calls[1]?.fillStyle).toBe('#d9ccad')
    })

    it('frames the editorial zone and names it above the frame', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene(), STYLE)

      const frame = calls.find((call) => call.op === 'strokeRect')
      const label = calls.find((call) => call.op === 'fillText')

      expect(frame?.args).toEqual([50, 60, 400, 300])
      expect(frame?.strokeStyle).toBe('rgba(42, 38, 31, 0.5)')
      expect(label?.args).toEqual(['editorial zone', 50, 54])
      expect(label?.fillStyle).toBe('#4a4238')
    })

    it('strokes a ring as a closed path, in the edit ink', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ rings: [SQUARE] }), STYLE)

      const path = calls.filter((call) =>
        ['beginPath', 'moveTo', 'lineTo', 'closePath', 'stroke'].includes(call.op)
      )

      expect(ops(path)).toEqual([
        'beginPath',
        'moveTo',
        'lineTo',
        'lineTo',
        'lineTo',
        'closePath',
        'stroke',
      ])
      expect(path[1]?.args).toEqual([100, 100])
      expect(path[1]?.strokeStyle).toBe('#5b93d6')
      expect(path[1]?.lineWidth).toBe(1)
    })

    it('draws a handle per anchor, white inside a blue outline', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ anchors: SQUARE }), STYLE)

      const arcs = calls.filter((call) => call.op === 'arc')

      expect(arcs).toHaveLength(4)
      expect(arcs[0]?.args).toEqual([100, 100, 4, 0, Math.PI * 2])
      expect(arcs[0]?.fillStyle).toBe('#ffffff')
      expect(arcs[0]?.strokeStyle).toBe('#5b93d6')
    })
  })

  describe('variants', () => {
    it('lays the terrain over the vellum and under the zone’s frame', () => {
      const { ctx, calls } = recordingContext()
      const image = {} as CanvasImageSource

      paintCanvas(
        ctx,
        SIZE,
        scene({ backdrop: { image, rect: { x: -40, y: -10, width: 1600, height: 1400 } } }),
        STYLE
      )
      const order = ops(calls)
      const drawn = calls.find((call) => call.op === 'drawImage')

      expect(drawn?.args).toEqual([image, -40, -10, 1600, 1400])
      expect(order.indexOf('fillRect')).toBeLessThan(order.indexOf('drawImage'))
      expect(order.indexOf('drawImage')).toBeLessThan(order.indexOf('strokeRect'))
    })

    it('draws no terrain while there is none, rather than a flat colour that reads as land', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ backdrop: null }), STYLE)

      expect(ops(calls)).not.toContain('drawImage')
      expect(ops(calls)).toContain('fillRect')
    })

    it('fills a selected handle solid, in the same reserved blue', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ anchors: SQUARE, selected: new Set([2]) }), STYLE)

      const arcs = calls.filter((call) => call.op === 'arc')

      expect(arcs[1]?.fillStyle).toBe('#ffffff')
      expect(arcs[2]?.fillStyle).toBe('#5b93d6')
      expect(arcs[3]?.fillStyle).toBe('#ffffff')
    })

    it('strokes every ring it is given', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ rings: [SQUARE, SQUARE, SQUARE] }), STYLE)

      expect(calls.filter((call) => call.op === 'closePath')).toHaveLength(3)
    })

    it('takes its colours from the style, so a theme change needs no painter change', () => {
      const { ctx, calls } = recordingContext()
      const other: PaintStyle = { ...STYLE, background: '#000000', anchorStroke: '#ff0000' }

      paintCanvas(ctx, SIZE, scene({ anchors: SQUARE }), other)

      expect(calls[1]?.fillStyle).toBe('#000000')
      expect(calls.find((call) => call.op === 'arc')?.strokeStyle).toBe('#ff0000')
    })

    it('paints the same pixels for the same scene, twice', () => {
      const first = recordingContext()
      const second = recordingContext()
      const same = scene({ rings: [SQUARE], anchors: SQUARE, selected: new Set([1]) })

      paintCanvas(first.ctx, SIZE, same, STYLE)
      paintCanvas(second.ctx, SIZE, same, STYLE)

      expect(second.calls).toEqual(first.calls)
    })
  })

  describe('managed errors', () => {
    it('paints an empty document without drawing a path or a handle', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene(), STYLE)

      expect(calls.filter((call) => call.op === 'arc')).toHaveLength(0)
      expect(calls.filter((call) => call.op === 'closePath')).toHaveLength(0)
      expect(ops(calls)).toContain('fillRect')
    })

    it('skips a ring of one point rather than stroking a path that draws nothing', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ rings: [[[10, 10]]] }), STYLE)

      expect(ops(calls)).not.toContain('moveTo')
    })

    it('skips an empty ring', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ rings: [[]] }), STYLE)

      expect(ops(calls)).not.toContain('beginPath')
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A for async — the painter awaits nothing and catches nothing. Below is the hostile input.
    it('draws a handle at a position that is not a position, rather than skipping it silently', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ anchors: [[Number.NaN, 10]] }), STYLE)

      // A real context draws nothing for NaN, so the defect shows as a missing handle on screen rather
      // than as a handle in the wrong place. Dropping it here would hide which anchor was broken.
      expect(calls.filter((call) => call.op === 'arc')).toHaveLength(1)
      expect(calls.find((call) => call.op === 'arc')?.args[0]).toBeNaN()
    })

    it('still clears and backs a canvas of no size', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, { width: 0, height: 0 }, scene(), STYLE)

      expect(calls[0]?.args).toEqual([0, 0, 0, 0])
    })
  })

  describe('edge cases', () => {
    it('puts the handles above the outlines, or they could not be aimed at', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ rings: [SQUARE], anchors: SQUARE }), STYLE)

      const lastRingOp = ops(calls).lastIndexOf('closePath')
      const firstHandle = ops(calls).indexOf('arc')

      expect(firstHandle).toBeGreaterThan(lastRingOp)
    })

    it('puts the background behind the zone, and the zone behind the outlines', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ rings: [SQUARE] }), STYLE)
      const order = ops(calls)

      expect(order.indexOf('fillRect')).toBeLessThan(order.indexOf('strokeRect'))
      expect(order.indexOf('strokeRect')).toBeLessThan(order.indexOf('moveTo'))
    })

    it('ignores a selection naming anchors that are not there', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ anchors: SQUARE, selected: new Set([99]) }), STYLE)

      const arcs = calls.filter((call) => call.op === 'arc')

      expect(arcs).toHaveLength(4)
      expect(arcs.every((arc) => arc.fillStyle === '#ffffff')).toBe(true)
    })
  })
})
