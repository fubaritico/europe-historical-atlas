import { describe, expect, it } from 'vitest'

import { UNFRAMED } from './viewport'
import { zoomLabel } from './zoomLabel'

describe('zoomLabel', () => {
  describe('happy path', () => {
    it('reads one backdrop pixel per CSS pixel as 100 %', () => {
      expect(zoomLabel({ scale: 1, originX: 0, originY: 0 }, 1)).toBe('100 %')
    })
  })

  describe('variants', () => {
    it('divides by the device pixel ratio, so a Retina screen reads the same zoom', () => {
      expect(zoomLabel({ scale: 2, originX: 0, originY: 0 }, 2)).toBe('100 %')
      expect(zoomLabel({ scale: 0.96, originX: 0, originY: 0 }, 2)).toBe('48 %')
    })

    it('rounds to a whole percent', () => {
      expect(zoomLabel({ scale: 0.4849, originX: 0, originY: 0 }, 1)).toBe('48 %')
      expect(zoomLabel({ scale: 3.2, originX: 0, originY: 0 }, 1)).toBe('320 %')
    })
  })

  describe('managed errors', () => {
    it('writes an em dash before the view is framed', () => {
      expect(zoomLabel(UNFRAMED, 2)).toBe('—')
    })
  })

  describe('unmanaged errors', () => {
    it('writes an em dash rather than a NaN percent for a broken scale or ratio', () => {
      expect(zoomLabel({ scale: Number.NaN, originX: 0, originY: 0 }, 2)).toBe('—')
      expect(zoomLabel({ scale: 1, originX: 0, originY: 0 }, 0)).toBe('—')
    })
  })

  describe('edge cases', () => {
    it('ignores the pan', () => {
      expect(zoomLabel({ scale: 1, originX: -480, originY: -564 }, 1)).toBe('100 %')
    })
  })
})
