import { describe, expect, it } from 'vitest'

import { parseProvenance, provenanceOf } from './provenance'

describe('provenanceOf', () => {
  describe('happy path', () => {
    it('splits the shipped mask’s declaration into a name and a licence', () => {
      expect(provenanceOf('Natural Earth 10m land minus lakes (public domain)')).toEqual({
        name: 'Natural Earth 10m land minus lakes',
        licence: 'public domain',
      })
    })
  })

  describe('variants', () => {
    it('takes the last bracket as the licence', () => {
      expect(provenanceOf('Survey (2nd ed.) of the coast (CC0)')).toEqual({
        name: 'Survey (2nd ed.) of the coast',
        licence: 'CC0',
      })
    })
  })

  describe('managed errors', () => {
    // A licence nobody declared is never recorded: the source is refused instead.
    it('refuses a source with no licence in brackets', () => {
      expect(() => provenanceOf('Natural Earth 10m land')).toThrow(/names no licence/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an empty source', () => {
      expect(() => provenanceOf('')).toThrow(/names no licence/)
    })
  })

  describe('edge cases', () => {
    it('ignores the whitespace around the declaration', () => {
      expect(provenanceOf('  Shore (CC0)  ')).toEqual({ name: 'Shore', licence: 'CC0' })
    })
  })
})

describe('parseProvenance', () => {
  it('reads the same name and licence as provenanceOf', () => {
    expect(parseProvenance('Survey (2nd ed.) of the coast (CC0)')).toEqual({
      name: 'Survey (2nd ed.) of the coast',
      licence: 'CC0',
    })
  })

  it('answers null rather than refusing a source with no licence', () => {
    expect(parseProvenance('derived from elevation above sea level')).toBeNull()
  })
})
