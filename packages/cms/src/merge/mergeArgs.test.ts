import { describe, expect, it } from 'vitest'

import { parseMergeArgs } from './mergeArgs'

// CMS-509: `pnpm cms:merge <collection> <kept> <merged away>`.
describe('parseMergeArgs', () => {
  describe('happy path', () => {
    it('reads the collection, the id kept and the id merged away', () => {
      expect(parseMergeArgs(['territories', '367', '412'])).toEqual({
        collection: 'territories',
        keep: 367,
        remove: 412,
      })
    })
  })

  describe('variants', () => {
    it('reads any collection’s name, left to the merge to refuse', () => {
      expect(parseMergeArgs(['people', '1', '2']).collection).toBe('people')
    })
  })

  describe('managed errors', () => {
    it('refuses a missing argument, and an extra one, with the usage', () => {
      expect(() => parseMergeArgs(['territories', '367'])).toThrow('pnpm cms:merge')
      expect(() => parseMergeArgs(['territories', '367', '412', '9'])).toThrow('trois arguments')
    })

    it.each(['abc', '0', '-3', '3.5', '012', ''])('refuses « %s » as an id', (text) => {
      expect(() => parseMergeArgs(['territories', '367', text])).toThrow('n’est pas un identifiant')
    })
  })

  // L4: N/A — a pure reading of strings.

  describe('edge cases', () => {
    it('reads two equal ids, left to the merge to refuse', () => {
      expect(parseMergeArgs(['places', '5', '5'])).toEqual({
        collection: 'places',
        keep: 5,
        remove: 5,
      })
    })
  })
})
