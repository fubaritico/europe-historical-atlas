// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LABEL_FAMILY, lazyLabelFace } from './nameFace'

/**
 * A stand-in for the browser's `FontFace`, counting the faces made and resolving or failing their load.
 * @param fails - whether the face's load fails
 * @returns the faces made, as `family source`
 */
function stubFontFace(fails = false): { made: string[] } {
  const made: string[] = []
  class FakeFace {
    constructor(family: string, source: string) {
      made.push(`${family} ${source}`)
    }
    load(): Promise<unknown> {
      return fails ? Promise.reject(new Error('no face')) : Promise.resolve(this)
    }
  }
  vi.stubGlobal('FontFace', FakeFace)
  // jsdom has no font set: one is given to the document for the test, taken back after it.
  Object.defineProperty(document, 'fonts', { value: { add: vi.fn() }, configurable: true })
  return { made }
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(document, 'fonts')
})

describe('lazyLabelFace', () => {
  describe('happy path', () => {
    it('loads the face at the first ask, under the labels’ family', async () => {
      const { made } = stubFontFace()
      await lazyLabelFace('face.woff2')()
      expect(made).toEqual([`${LABEL_FAMILY} url(face.woff2)`])
    })
  })

  describe('variants', () => {
    it('loads it once for a drawer, however many labels ask', async () => {
      const { made } = stubFontFace()
      const load = lazyLabelFace('face.woff2')
      await Promise.all([load(), load(), load()])
      expect(made).toHaveLength(1)
    })
  })

  describe('managed errors', () => {
    it('rejects when the face cannot load, for the drawer’s caller to say', async () => {
      stubFontFace(true)
      await expect(lazyLabelFace('face.woff2')()).rejects.toThrow('no face')
    })
  })

  // L4: N/A — the face's load is the one failure, managed above.

  describe('edge cases', () => {
    it('fetches nothing for a drawer that never asks', () => {
      const { made } = stubFontFace()
      lazyLabelFace('face.woff2')
      expect(made).toEqual([])
    })
  })
})
