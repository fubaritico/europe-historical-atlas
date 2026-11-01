import { afterEach, describe, expect, it, vi } from 'vitest'

import { CITY_NAME_TYPE, canvasLabelDrawer } from './cityLabel'

/** What the drawer did on its canvas, in order: each text drawn, how, and with what line. */
interface Stroke {
  readonly how: 'fill' | 'stroke'
  readonly text: string
  readonly lineWidth: number
  readonly style: string
}

/**
 * A 2D context that records the text it is asked to draw — jsdom has none.
 * @returns the context and its record
 */
function recordingContext(): { context: object; drawn: Stroke[] } {
  const drawn: Stroke[] = []
  const state = { lineWidth: 1, strokeStyle: '', fillStyle: '' }
  const context = {
    ...state,
    font: '',
    textBaseline: '',
    lineJoin: '',
    measureText: (text: string) => ({ width: text.length * 8 }),
    scale: () => undefined,
    fillText(text: string) {
      drawn.push({ how: 'fill', text, lineWidth: this.lineWidth, style: this.fillStyle })
    },
    strokeText(text: string) {
      drawn.push({ how: 'stroke', text, lineWidth: this.lineWidth, style: this.strokeStyle })
    },
  }
  return { context, drawn }
}

/** Stand-ins for the face and the canvas, and the record of what was drawn. */
function standIns(): Stroke[] {
  const { context, drawn } = recordingContext()
  vi.stubGlobal(
    'FontFace',
    class {
      load(): Promise<this> {
        return Promise.resolve(this)
      }
    }
  )
  Object.defineProperty(document, 'fonts', { value: { add: vi.fn() }, configurable: true })
  // The drawer makes one canvas a name: a real one, its 2D context the recording one.
  const canvas = Object.assign(document.createElement('canvas'), { getContext: () => context })
  vi.spyOn(document, 'createElement').mockReturnValue(canvas)
  return drawn
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('canvasLabelDrawer', () => {
  describe('happy path', () => {
    it('draws the light edge, then the ink, then the ink once more as a thin stroke — the false bold', async () => {
      const drawn = standIns()

      await canvasLabelDrawer('face.woff2')('Esztergom', 'capital')

      expect(drawn.map(({ how }) => how)).toEqual(['stroke', 'fill', 'stroke'])
      const [edge, , bold] = drawn
      expect(edge?.lineWidth).toBeGreaterThan(bold?.lineWidth ?? Number.POSITIVE_INFINITY)
      expect(bold?.style).toBe(drawn[1]?.style)
      expect(edge?.style).not.toBe(bold?.style)
    })
  })

  describe('variants', () => {
    it('writes the name as it is given, never in capitals', async () => {
      const drawn = standIns()

      await canvasLabelDrawer('face.woff2')('Székesfehérvár', 'capital')

      expect(drawn.every(({ text }) => text === 'Székesfehérvár')).toBe(true)
    })

    it('sets the orders larger first, so the size reads as an order (Bertin)', () => {
      expect(CITY_NAME_TYPE.capital.size).toBeGreaterThan(CITY_NAME_TYPE['large-city'].size)
      expect(CITY_NAME_TYPE['large-city'].size).toBeGreaterThan(CITY_NAME_TYPE.city.size)
    })
  })

  // L3/L4: a face that cannot load rejects the drawer — the layer says so (cityMarkers.test.ts, managed errors).
  // L5: N/A — the layout's arithmetic is tested in cityMarkers.test.ts (layoutLabel).
})
