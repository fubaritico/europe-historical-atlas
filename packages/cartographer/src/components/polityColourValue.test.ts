import { afterEach, describe, expect, it, vi } from 'vitest'

import { pickedColour, recolouring, toFileColour } from './polityColourValue'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

const FRANCE: YearPolity = {
  id: 'fr',
  name: 'Royaume de France',
  rank: 'kingdom',
  status: null,
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: '#c0392b',
  wikidata: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('polity colour values', () => {
  describe('happy path', () => {
    it('reads a file colour into the picker and writes it back unchanged', () => {
      const picked = pickedColour(FRANCE)
      expect(picked).not.toBeNull()
      expect(toFileColour(picked)).toBe('#c0392b')
    })
  })

  describe('variants', () => {
    it('names the step after the polity, and replaces only its colour', () => {
      const change = recolouring(FRANCE, null)
      expect(change?.step).toEqual({ kind: 'colour-polity', label: 'colour Royaume de France' })
      expect(change?.polity).toEqual({ ...FRANCE, colour: null })
    })

    it('reads "automatic" as null, and writes null back', () => {
      expect(pickedColour({ ...FRANCE, colour: null })).toBeNull()
      expect(toFileColour(null)).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('opens a colour that is no hex as automatic, and says so', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      expect(pickedColour({ ...FRANCE, colour: 'crimson' })).toBeNull()
      expect(error).toHaveBeenCalledOnce()
    })
  })

  // L4: N/A — pure conversions; the behaviors package's own functions are tested upstream.

  describe('edge cases', () => {
    it('asks nothing of the document when the gesture ends on the colour it began with', () => {
      expect(recolouring(FRANCE, pickedColour(FRANCE))).toBeNull()
      expect(recolouring({ ...FRANCE, colour: null }, null)).toBeNull()
    })

    it('leaves the polity it was handed untouched', () => {
      const before = { ...FRANCE }
      recolouring(FRANCE, null)
      expect(FRANCE).toEqual(before)
    })

    it('writes six digits even when the picker held a translucent colour', () => {
      expect(toFileColour({ h: 0, s: 100, v: 100, a: 0.5 })).toMatch(/^#[0-9a-f]{6}$/)
    })
  })
})
