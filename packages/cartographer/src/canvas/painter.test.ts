import { describe, expect, it } from 'vitest'

import { DEFAULT_LAYERS } from '../state/layersSlice'

import { paintCanvas } from './painter'

import type { CanvasScene, PaintStyle, Painter2D } from './painter'
import type { PixelSize, Point } from '../view/viewport'

/** One call the fake recorded: what was asked for, and the state the context was in. */
interface Call {
  /** The member called. */
  op: string
  /** Its arguments — the backdrop passes an image source among them. */
  args: (number | string | CanvasImageSource | undefined)[]
  /** The fill colour at the time. */
  fillStyle: string | CanvasGradient | CanvasPattern
  /** The stroke colour at the time. */
  strokeStyle: string | CanvasGradient | CanvasPattern
  /** The blend at the time. */
  globalCompositeOperation: string
  /** The opacity at the time — a layer's, in `{Layers}`. */
  globalAlpha: number
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
    globalCompositeOperation: GlobalCompositeOperation
    globalAlpha: number
  } = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    globalCompositeOperation: 'source-over',
    globalAlpha: 1,
  }
  const record =
    (op: string) =>
    (...args: (number | string | CanvasImageSource | undefined)[]): void => {
      calls.push({
        op,
        args,
        fillStyle: state.fillStyle,
        strokeStyle: state.strokeStyle,
        lineWidth: state.lineWidth,
        globalCompositeOperation: state.globalCompositeOperation,
        globalAlpha: state.globalAlpha,
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
    rect: record('rect'),
    fillText: record('fillText'),
    drawImage: record('drawImage'),
    setTransform: record('setTransform'),
    setLineDash: (segments: number[]) => {
      record('setLineDash')(...segments)
    },
    lineCap: 'butt',
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
    get globalCompositeOperation() {
      return state.globalCompositeOperation
    },
    set globalCompositeOperation(value: GlobalCompositeOperation) {
      state.globalCompositeOperation = value
    },
    get globalAlpha(): number {
      return state.globalAlpha
    },
    set globalAlpha(value: number) {
      state.globalAlpha = value
    },
  }
  return { ctx, calls }
}

/** The design's values, from `design/chrome.css`. */
const STYLE: PaintStyle = {
  background: '#d9ccad',
  zoneStroke: 'rgba(42, 38, 31, 0.5)',
  zoneLabel: '#4a4238',
  zoneWidth: 1,
  zoneVeil: 'rgba(0, 0, 0, 0.25)',
  labelSize: 11,
  labelFamily: 'sans-serif',
  labelPad: 8,
  pathStroke: '#5b93d6',
  pathWidth: 1,
  anchorFill: '#ffffff',
  anchorStroke: '#5b93d6',
  anchorRadius: 4,
  snapAnchorRadius: 2,
  borderCore: '#f3e7cd',
  borderEdge: '#5c3a2e',
  borderWidth: 1.4,
  borderEdgeWidth: 3.2,
  frontierWidth: 2.4,
  fillBlend: 'overlay',
  coastStroke: 'rgba(60, 50, 38, 0.85)',
  coastWidth: 1,
  riverStroke: 'rgba(74, 52, 36, 0.3)',
  riverWidthMajor: 1.25,
  riverWidthMinor: 0.95,
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
    fills: [],
    anchors: [],
    // Every anchor gets a handle unless a test says otherwise — the handle filter is the scene's
    // decision (`targetHandles`), not the painter's, which only draws the indices it is handed.
    handles: (overrides.anchors ?? []).map((_, index) => index),
    snapAnchors: [],
    borders: [],
    layers: DEFAULT_LAYERS,
    selected: new Set<number>(),
    vectors: null,
    ...overrides,
  }
}

/** The ops a painted scene performed, in order. */
function ops(calls: Call[]): string[] {
  return calls.map((call) => call.op)
}

/** A scene carrying one coast contour and one river, under a doubled view. */
const withVectors = (scale = 2) =>
  scene({
    vectors: {
      coast: [
        {
          points: [
            [0, 0],
            [10, 0],
            [10, 10],
          ],
          closed: true,
          bounds: { left: 0, top: 0, right: 10, bottom: 10 },
        },
      ],
      rivers: [
        {
          points: [
            [1, 1],
            [5, 5],
          ],
          bounds: { left: 1, top: 1, right: 5, bottom: 5 },
          rank: 1,
        },
      ],
      scale,
      originX: 7,
      originY: 9,
    },
  })

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

    it('frames the editorial zone and names it inside the frame', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene(), STYLE)

      const frame = calls.find((call) => call.op === 'strokeRect')
      const label = calls.find((call) => call.op === 'fillText')

      expect(frame?.args).toEqual([50, 60, 400, 300])
      expect(frame?.strokeStyle).toBe('rgba(42, 38, 31, 0.5)')
      // Inside, at the corner plus the padding, the baseline one line down. It was at `y - 6` until
      // 2026-10-09 — above the frame, so off the canvas whenever the zone's north was above the view.
      expect(label?.args).toEqual(['editorial zone', 50 + 8, 60 + 8 + 11])
      expect(label?.fillStyle).toBe('#4a4238')
    })

    it('veils everything outside the zone, as one path with a hole', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene(), STYLE)

      const veil = calls.find((call) => call.op === 'fill' && call.args[0] === 'evenodd')
      const rects = calls.filter((call) => call.op === 'rect')

      expect(veil?.fillStyle).toBe('rgba(0, 0, 0, 0.25)')
      // The canvas, then the zone — the second is the hole, which is what `evenodd` makes of it.
      expect(rects.map((call) => call.args)).toEqual([
        [0, 0, SIZE.width, SIZE.height],
        [50, 60, 400, 300],
      ])
    })

    it('keeps the name on screen when the zone runs off the top left', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(
        ctx,
        SIZE,
        { ...scene(), editorialZone: { x: -200, y: -150, width: 900, height: 800 } },
        STYLE
      )
      const label = calls.find((call) => call.op === 'fillText')

      // Clamped to the visible corner rather than drawn off-canvas at −192.
      expect(label?.args).toEqual(['editorial zone', 8, 8 + 11])
    })

    it('strokes a ring as a closed path, in the edit ink', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ rings: [SQUARE] }), STYLE)

      // From the first `moveTo` on: the veil opens a path of its own before any ring is reached, and
      // this test is about the ring. Taking the whole sequence made it fail for the veil's beginPath,
      // which says nothing about how an outline is stroked.
      const start = calls.findIndex((call) => call.op === 'moveTo')
      const path = calls
        .slice(start - 1)
        .filter((call) =>
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

      // No ring is drawn, so nothing moves the pen: `moveTo` is the honest marker here. `beginPath`
      // stopped being one when the veil started opening a path before any ring exists.
      expect(ops(calls)).not.toContain('moveTo')
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
  describe('the vector layers', () => {
    it('draws them under the view’s transform instead of projecting them', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, withVectors(), STYLE)

      const transforms = calls.filter((call) => call.op === 'setTransform')

      // Set once for the layers, and the coordinates go through untouched: 125 000 points remapped in
      // JavaScript would allocate about 2 MB on every pointermove of a pan.
      expect(transforms[0]?.args).toEqual([2, 0, 0, 2, 7, 9])
      expect(calls.some((call) => call.op === 'moveTo' && call.args[0] === 0)).toBe(true)
    })

    it('puts the transform back, so nothing else is magnified', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, withVectors(), STYLE)

      const transforms = calls.filter((call) => call.op === 'setTransform')
      const handles = calls.findIndex((call) => call.op === 'arc')
      const lastTransform = calls.map((call) => call.op).lastIndexOf('setTransform')

      // The trap this test exists for. Everything else on this canvas arrives in screen pixels, so a
      // transform left in place would scale the handles, the zone's frame and its label — a defect that
      // reads as a styling mistake and is not. Identity, and before anything else is drawn.
      expect(transforms.at(-1)?.args).toEqual([1, 0, 0, 1, 0, 0])
      if (handles !== -1) expect(lastTransform).toBeLessThan(handles)
    })

    it('divides the stroke widths by the scale, the widths being in screen pixels', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, withVectors(4), STYLE)

      const strokes = calls.filter((call) => call.op === 'stroke')

      // Without this a river at zoom 8 is eight times too thick — and the error grows with the zoom, so
      // it looks right in the opening view, which is the only one anyone checks.
      expect(strokes.some((call) => call.lineWidth === STYLE.riverWidthMajor / 4)).toBe(true)
      expect(strokes.some((call) => call.lineWidth === STYLE.coastWidth / 4)).toBe(true)
    })

    it('draws a major river thicker than a minor one, the atlas’s width by rank', () => {
      const { ctx, calls } = recordingContext()
      const bounds = { left: 1, top: 1, right: 5, bottom: 5 }
      const points: [number, number][] = [
        [1, 1],
        [5, 5],
      ]
      const twoRanks = scene({
        vectors: {
          coast: [],
          rivers: [
            { points, bounds, rank: 9 },
            { points, bounds, rank: 1 },
          ],
          scale: 1,
          originX: 0,
          originY: 0,
        },
      })

      paintCanvas(ctx, SIZE, twoRanks, STYLE)
      // The rivers' strokes come first, the major one first; the coastline's follows them.
      const widths = calls.filter((call) => call.op === 'stroke').map((call) => call.lineWidth)

      expect(widths.slice(0, 2)).toEqual([STYLE.riverWidthMajor, STYLE.riverWidthMinor])
    })

    it('strokes each layer once, not once per contour', () => {
      const { ctx, calls } = recordingContext()
      const many = scene({
        vectors: {
          coast: Array.from({ length: 50 }, () => ({
            points: [[0, 0] as const],
            closed: false,
            bounds: { left: 0, top: 0, right: 0, bottom: 0 },
          })),
          rivers: [],
          scale: 1,
          originX: 0,
          originY: 0,
        },
      })

      paintCanvas(ctx, SIZE, many, STYLE)

      // A 2D context pays per `stroke()`, not per sub-path: 2 029 contours in one call rather than
      // 2 029 calls is the other half of what chaining bought.
      expect(calls.filter((call) => call.op === 'stroke').length).toBeLessThan(6)
    })

    it('skips a contour whose box is off screen, without looking at its points', () => {
      const { ctx, calls } = recordingContext()
      const faraway = scene({
        vectors: {
          coast: [
            {
              points: Array.from({ length: 500 }, (_, i) => [9000 + i, 9000] as const),
              closed: false,
              bounds: { left: 9000, top: 9000, right: 9500, bottom: 9000 },
            },
          ],
          rivers: [],
          scale: 1,
          originX: 0,
          originY: 0,
        },
      })

      paintCanvas(ctx, SIZE, faraway, STYLE)

      // One comparison instead of 500 lineTo calls. Zoomed over France this is what skips the Baltic,
      // the Aegean and the Caspian — each otherwise traced in full into a path that clips them away.
      expect(calls.some((call) => call.op === 'lineTo')).toBe(false)
      expect(calls.some((call) => call.op === 'moveTo')).toBe(false)
    })

    it('still draws a contour that only partly overlaps the view', () => {
      const { ctx, calls } = recordingContext()
      const straddling = scene({
        vectors: {
          coast: [
            {
              points: [
                [-50, 10],
                [50, 10],
              ],
              closed: false,
              bounds: { left: -50, top: 10, right: 50, bottom: 10 },
            },
          ],
          rivers: [],
          scale: 1,
          originX: 0,
          originY: 0,
        },
      })

      paintCanvas(ctx, SIZE, straddling, STYLE)

      // Culling must be conservative: a coast running in from off screen is the normal case, and
      // dropping it would make the map end at the window's edge.
      expect(calls.some((call) => call.op === 'moveTo')).toBe(true)
    })

    it('drops points too close together to move a screen pixel, when zoomed out', () => {
      const { ctx, calls } = recordingContext()
      // Twenty points spread over two backdrop pixels, at a quarter scale: half a screen pixel in
      // total. Nineteen of them cannot change a single pixel.
      const dense = scene({
        vectors: {
          coast: [
            {
              points: Array.from({ length: 20 }, (_, i) => [i * 0.1, 0] as const),
              closed: false,
              bounds: { left: 0, top: 0, right: 2, bottom: 0 },
            },
          ],
          rivers: [],
          scale: 0.25,
          originX: 0,
          originY: 0,
        },
      })

      paintCanvas(ctx, SIZE, dense, STYLE)

      // The trap underneath this one: comparing each point to its **predecessor** rather than to the
      // last point actually kept decimates almost nothing on a dense run — every step is small, but
      // they accumulate. The comparison has to be against what was kept.
      expect(calls.filter((call) => call.op === 'lineTo')).toHaveLength(1)
    })

    it('measures the gap from the last point kept, not from the one before', () => {
      const { ctx, calls } = recordingContext()
      // Twenty points one backdrop pixel apart, at a quarter scale: each step is a quarter of a screen
      // pixel, but four of them make a whole one. So the run must keep roughly one point in four.
      const marching = scene({
        vectors: {
          coast: [
            {
              points: Array.from({ length: 20 }, (_, i) => [i, 0] as const),
              closed: false,
              bounds: { left: 0, top: 0, right: 19, bottom: 0 },
            },
          ],
          rivers: [],
          scale: 0.25,
          originX: 0,
          originY: 0,
        },
      })

      paintCanvas(ctx, SIZE, marching, STYLE)

      const kept = calls.filter((call) => call.op === 'lineTo').length

      // **This is the test that separates the two implementations**, and the obvious one does not:
      // comparing each point to its predecessor drops everything here (no single step clears the
      // threshold) and leaves a straight line from the first point to the last — a coast reduced to a
      // chord. The neighbouring 'drops points too close together' case cannot see it, because there the
      // *cumulative* span also stays under the threshold, so both versions answer the same. Verified by
      // replaying the predecessor version: it passes that one and fails this.
      expect(kept).toBeGreaterThan(3)
      expect(kept).toBeLessThan(8)
    })

    it('keeps every point that is at least a screen pixel from the last one kept', () => {
      const { ctx, calls } = recordingContext()
      // One backdrop pixel apart at scale 8 is eight screen pixels apart: all distinguishable.
      const spread = scene({
        vectors: {
          coast: [
            {
              points: Array.from({ length: 20 }, (_, i) => [i, 0] as const),
              closed: false,
              bounds: { left: 0, top: 0, right: 19, bottom: 0 },
            },
          ],
          rivers: [],
          scale: 8,
          originX: 0,
          originY: 0,
        },
      })

      paintCanvas(ctx, SIZE, spread, STYLE)

      // The threshold is a **screen** pixel, not a zoom level — a distinction the first version of this
      // test got wrong, expecting magnification alone to keep everything. At scale 8 points a tenth of
      // a backdrop pixel apart are still only eight tenths of a screen pixel apart, and the code was
      // right to drop them. Decimating what the reader *can* separate is the real defect, and this is
      // the case that catches it.
      expect(calls.filter((call) => call.op === 'lineTo')).toHaveLength(19)
    })

    it('never drops the last point of a run', () => {
      const { ctx, calls } = recordingContext()
      const run = scene({
        vectors: {
          coast: [
            {
              points: [
                [0, 0],
                [100, 0],
                [100.01, 0],
              ],
              closed: true,
              bounds: { left: 0, top: 0, right: 100.01, bottom: 0 },
            },
          ],
          rivers: [],
          scale: 0.25,
          originX: 0,
          originY: 0,
        },
      })

      paintCanvas(ctx, SIZE, run, STYLE)

      const drawn = calls.filter((call) => call.op === 'lineTo').map((call) => call.args[0])

      // Dropping it shortens an open coast by up to a pixel on every repaint and, worse, leaves a
      // closed ring's final segment to be invented by `closePath` across a gap that is not there.
      expect(drawn).toContain(100.01)
    })

    it('draws nothing and sets no transform when the layers have not loaded', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, scene({ vectors: null }), STYLE)

      expect(calls.some((call) => call.op === 'setTransform')).toBe(false)
    })

    it('refuses a scale of zero rather than collapsing the map to a point', () => {
      const { ctx, calls } = recordingContext()

      paintCanvas(ctx, SIZE, withVectors(0), STYLE)

      // A zero scale would divide the stroke widths by zero and map every point onto the origin. It
      // cannot arrive from the viewport, which clamps — this is the guard for the day something else
      // writes one.
      expect(calls.some((call) => call.op === 'setTransform')).toBe(false)
    })
  })
})

describe('painter — fills and handles', () => {
  describe('happy path', () => {
    // The atlas's tint: the colour at full strength, blended into the relief, and the blend reset after.
    it('fills a territory in its colour in overlay, then restores normal compositing', () => {
      const { ctx, calls } = recordingContext()
      paintCanvas(ctx, SIZE, scene({ fills: [{ rings: [SQUARE], colour: '#54719b' }] }), STYLE)
      const fill = calls.find((call) => call.op === 'fill' && call.fillStyle === '#54719b')
      expect(fill?.globalCompositeOperation).toBe('overlay')
      expect(fill?.args).toEqual(['evenodd'])
      expect(ctx.globalCompositeOperation).toBe('source-over')
    })

    // As the atlas bakes it: the tint on the relief, the coastline drawn over the tint.
    it('fills before it strokes the coastline, so the shore is not tinted', () => {
      const { ctx, calls } = recordingContext()
      const run = {
        points: [
          [0, 0],
          [10, 0],
          [10, 10],
        ] as [number, number][],
        bounds: { left: 0, top: 0, right: 10, bottom: 10 },
      }
      paintCanvas(
        ctx,
        SIZE,
        scene({
          fills: [{ rings: [SQUARE], colour: '#54719b' }],
          vectors: { coast: [run], rivers: [], scale: 1, originX: 0, originY: 0 },
        }),
        STYLE
      )
      const fillAt = calls.findIndex((call) => call.op === 'fill' && call.fillStyle === '#54719b')
      const coastAt = calls.findIndex(
        (call) => call.op === 'stroke' && call.strokeStyle === STYLE.coastStroke
      )
      expect(fillAt).toBeGreaterThan(-1)
      expect(coastAt).toBeGreaterThan(fillAt)
      expect(calls[coastAt]?.globalCompositeOperation).toBe('source-over')
    })
  })

  describe('variants', () => {
    it('draws a neighbour’s anchor as a small blue dot, under the handles', () => {
      const { ctx, calls } = recordingContext()
      paintCanvas(ctx, SIZE, scene({ anchors: SQUARE, handles: [0], snapAnchors: [2] }), STYLE)
      const arcs = calls.filter((call) => call.op === 'arc')
      expect(arcs.map((call) => call.args.slice(0, 3))).toEqual([
        [200, 200, 2],
        [100, 100, 4],
      ])
      const dot = calls.findIndex((call) => call.op === 'fill' && call.fillStyle === '#5b93d6')
      expect(dot).toBeGreaterThan(-1)
    })

    it('skips a neighbour’s anchor that falls off the canvas', () => {
      const { ctx, calls } = recordingContext()
      const anchors: Point[] = [...SQUARE, [900, 100], [100, -10]]
      paintCanvas(ctx, SIZE, scene({ anchors, handles: [], snapAnchors: [0, 4, 5] }), STYLE)
      const arcs = calls.filter((call) => call.op === 'arc')
      expect(arcs.map((call) => call.args.slice(0, 2))).toEqual([[100, 100]])
    })

    it('draws a handle only for the anchors it is told to', () => {
      const { ctx, calls } = recordingContext()
      paintCanvas(ctx, SIZE, scene({ anchors: SQUARE, handles: [2] }), STYLE)
      const arcs = calls.filter((call) => call.op === 'arc')
      expect(arcs.map((call) => call.args.slice(0, 2))).toEqual([[200, 200]])
    })
  })

  describe('managed errors', () => {
    it('skips a ring of two points, which encloses nothing', () => {
      const { ctx, calls } = recordingContext()
      paintCanvas(
        ctx,
        SIZE,
        scene({ fills: [{ rings: [SQUARE.slice(0, 2)], colour: '#123456' }] }),
        STYLE
      )
      expect(calls.filter((call) => call.op === 'lineTo' && call.fillStyle === '#123456')).toEqual(
        []
      )
    })
  })

  describe('unmanaged errors', () => {
    it('skips a handle index past the anchor table', () => {
      const { ctx, calls } = recordingContext()
      paintCanvas(ctx, SIZE, scene({ anchors: SQUARE, handles: [9] }), STYLE)
      expect(calls.filter((call) => call.op === 'arc')).toEqual([])
    })
  })

  describe('edge cases', () => {
    // H-07 — a ring inside another is a hole: one path, filled even-odd.
    it('fills all of a polity’s rings in one path', () => {
      const { ctx, calls } = recordingContext()
      const inner: Point[] = [
        [120, 120],
        [180, 120],
        [180, 180],
      ]
      paintCanvas(
        ctx,
        SIZE,
        scene({ fills: [{ rings: [SQUARE, inner], colour: '#54719b' }] }),
        STYLE
      )
      expect(
        calls.filter((call) => call.op === 'fill' && call.fillStyle === '#54719b')
      ).toHaveLength(1)
      expect(
        calls.filter((call) => call.op === 'closePath' && call.fillStyle === '#54719b')
      ).toHaveLength(2)
    })
  })
})

const strokesOf = (calls: Call[]) =>
  calls.filter((call) => call.op === 'stroke' && call.strokeStyle !== STYLE.pathStroke)

// The borders of 2026-10-13: derived from the shared anchors, each drawn in its hand (`core/borderHands`).
describe('painter — borders', () => {
  const RUN: Point[] = [
    [100, 100],
    [200, 100],
    [300, 150],
  ]
  const SOVEREIGN = { pattern: 'solid', cased: true, weight: 1 } as const
  describe('happy path', () => {
    it('draws a sovereign border as a cream core inside a brown casing, casing first', () => {
      const { ctx, calls } = recordingContext()
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand: SOVEREIGN, layer: 'borders' as const }] }),
        STYLE
      )
      expect(strokesOf(calls).map((call) => [call.strokeStyle, call.lineWidth])).toEqual([
        [STYLE.borderEdge, STYLE.borderEdgeWidth],
        [STYLE.borderCore, STYLE.borderWidth],
      ])
    })
  })

  describe('variants', () => {
    it('draws a frontier against unclaimed ground as one brown stroke', () => {
      const { ctx, calls } = recordingContext()
      const hand = { pattern: 'solid', cased: false, weight: 1 } as const
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand, layer: 'borders' as const }] }),
        STYLE
      )
      expect(strokesOf(calls).map((call) => [call.strokeStyle, call.lineWidth])).toEqual([
        [STYLE.borderEdge, STYLE.frontierWidth],
      ])
    })

    it('dots a vassal’s limit, then clears the dash for what follows', () => {
      const { ctx, calls } = recordingContext()
      const hand = { pattern: 'dotted', cased: true, weight: 1 } as const
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand, layer: 'borders' as const }] }),
        STYLE
      )
      const dashes = calls.filter((call) => call.op === 'setLineDash').map((call) => call.args)
      expect(dashes[0]?.length).toBe(2)
      expect(dashes.at(-1)).toEqual([])
    })

    it('scales a lighter hand’s widths by its weight', () => {
      const { ctx, calls } = recordingContext()
      const hand = { pattern: 'solid', cased: true, weight: 0.5 } as const
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand, layer: 'borders' as const }] }),
        STYLE
      )
      expect(strokesOf(calls).map((call) => call.lineWidth)).toEqual([
        STYLE.borderEdgeWidth * 0.5,
        STYLE.borderWidth * 0.5,
      ])
    })
  })

  describe('managed errors', () => {
    it('draws nothing for a coast, whose line the coastline already is', () => {
      const { ctx, calls } = recordingContext()
      const hand = { pattern: 'none', cased: false, weight: 1 } as const
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand, layer: 'borders' as const }] }),
        STYLE
      )
      expect(strokesOf(calls)).toEqual([])
    })
  })

  // L4: N/A — the scene hands only projected points; a run with a missing anchor arrives shorter.

  describe('edge cases', () => {
    it('draws the borders under the edit outlines, so the tool’s blue stays on top', () => {
      const { ctx, calls } = recordingContext()
      paintCanvas(
        ctx,
        SIZE,
        scene({
          rings: [SQUARE],
          borders: [{ points: RUN, hand: SOVEREIGN, layer: 'borders' as const }],
        }),
        STYLE
      )
      const core = calls.findIndex(
        (call) => call.op === 'stroke' && call.strokeStyle === STYLE.borderCore
      )
      const outline = calls.findIndex(
        (call) => call.op === 'stroke' && call.strokeStyle === STYLE.pathStroke
      )
      expect(core).toBeGreaterThan(-1)
      expect(outline).toBeGreaterThan(core)
    })

    it('doubles a contested hand with a thin casing line down its core', () => {
      const { ctx, calls } = recordingContext()
      const hand = { pattern: 'double', cased: true, weight: 1 } as const
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand, layer: 'borders' as const }] }),
        STYLE
      )
      expect(strokesOf(calls)).toHaveLength(3)
    })
  })
})

// {Layers}, 2026-10-13: an eye hides a layer, a slider sets its opacity.
describe('painter — layers', () => {
  const RUN: Point[] = [
    [100, 100],
    [200, 100],
  ]
  const hand = { pattern: 'solid', cased: false, weight: 1 } as const

  describe('happy path', () => {
    it('draws nothing of a hidden layer', () => {
      const { ctx, calls } = recordingContext()
      const layers = { ...DEFAULT_LAYERS, unclaimed: { visible: false, opacity: 100 } }
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand, layer: 'unclaimed' as const }], layers }),
        STYLE
      )
      expect(
        calls.filter((call) => call.op === 'stroke' && call.strokeStyle === STYLE.borderEdge)
      ).toEqual([])
    })
  })

  describe('variants', () => {
    it('draws a layer at its opacity, then restores full opacity', () => {
      const { ctx, calls } = recordingContext()
      const layers = { ...DEFAULT_LAYERS, borders: { visible: true, opacity: 40 } }
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand, layer: 'borders' as const }], layers }),
        STYLE
      )
      const stroke = calls.find(
        (call) => call.op === 'stroke' && call.strokeStyle === STYLE.borderEdge
      )
      expect(stroke?.globalAlpha).toBe(0.4)
      expect(calls.at(-1)?.globalAlpha).toBe(1)
    })
  })

  // L3/L4: N/A — the settings arrive from the slice, which clamps and refuses.

  describe('edge cases', () => {
    it('keeps the other layer of the borders when one is hidden', () => {
      const { ctx, calls } = recordingContext()
      const layers = { ...DEFAULT_LAYERS, unclaimed: { visible: false, opacity: 100 } }
      paintCanvas(
        ctx,
        SIZE,
        scene({ borders: [{ points: RUN, hand, layer: 'borders' as const }], layers }),
        STYLE
      )
      expect(
        calls.filter((call) => call.op === 'stroke' && call.strokeStyle === STYLE.borderEdge)
      ).toHaveLength(1)
    })
  })
})
