/**
 * Stand-ins for what the names' stage needs from the page and jsdom lacks: a face that loads at once, a font set, and a
 * 2D context that measures every character the same — so a test can place a year's names end to end.
 */

import { vi } from 'vitest'

/** A 2D context measuring every character the same, as jsdom has none. */
export const NAME_CONTEXT = {
  font: '',
  fillStyle: '',
  textBaseline: '',
  textAlign: '',
  measureText: () => ({
    width: 64,
    actualBoundingBoxAscent: 90,
    actualBoundingBoxDescent: 10,
    fontBoundingBoxAscent: 100,
    fontBoundingBoxDescent: 30,
  }),
  fillText: vi.fn(),
  getImageData: (_x: number, _y: number, w: number, h: number) => ({
    data: new Uint8ClampedArray(w * h * 4),
  }),
  createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  putImageData: vi.fn(),
}

/**
 * Install the stand-ins: undone by `vi.unstubAllGlobals` and `vi.restoreAllMocks`.
 */
export function stubNameFace(): void {
  vi.stubGlobal(
    'FontFace',
    class {
      /**
       * Loads at once.
       * @returns itself
       */
      load(): Promise<this> {
        return Promise.resolve(this)
      }
    }
  )
  Object.defineProperty(document, 'fonts', { value: { add: vi.fn() }, configurable: true })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    NAME_CONTEXT as unknown as CanvasRenderingContext2D
  )
}
