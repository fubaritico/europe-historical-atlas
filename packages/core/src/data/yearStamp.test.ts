import { describe, expect, it } from 'vitest'

import { yearStamp } from './yearStamp'

const FILES = { registry: '{"version":1}', polities: '{"anchors":[]}', borders: '{"pairs":[]}' }

describe('yearStamp', () => {
  describe('happy path', () => {
    it('gives the same fingerprint to the same three texts', () => {
      expect(yearStamp(FILES)).toBe(yearStamp({ ...FILES }))
    })

    it('writes eight hexadecimal digits', () => {
      expect(yearStamp(FILES)).toMatch(/^[0-9a-f]{8}$/)
    })
  })

  describe('variants', () => {
    // CARTO-238 rung 3: a write by anything else changes at least one file.
    it('changes when any one of the three files changes by a single character', () => {
      const stamp = yearStamp(FILES)
      expect(yearStamp({ ...FILES, registry: '{"version":2}' })).not.toBe(stamp)
      expect(yearStamp({ ...FILES, polities: '{"anchors":[ ]}' })).not.toBe(stamp)
      expect(yearStamp({ ...FILES, borders: '{"pairs":[]}\n' })).not.toBe(stamp)
    })

    it('tells the files apart: the same texts in other slots are another year', () => {
      expect(yearStamp({ registry: 'a', polities: 'b', borders: 'c' })).not.toBe(
        yearStamp({ registry: 'b', polities: 'a', borders: 'c' })
      )
    })
  })

  describe('managed errors', () => {
    // A file gone from disk is a change, never mistaken for an empty one.
    it('marks a missing file apart from an empty one', () => {
      expect(yearStamp({ ...FILES, borders: null })).not.toBe(yearStamp({ ...FILES, borders: '' }))
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — pure arithmetic over strings, nothing thrown.
    it('keeps the separator from letting text slide between two files', () => {
      expect(yearStamp({ registry: 'ab', polities: 'c', borders: '' })).not.toBe(
        yearStamp({ registry: 'a', polities: 'bc', borders: '' })
      )
    })
  })

  describe('edge cases', () => {
    it('fingerprints a year with no file at all', () => {
      expect(yearStamp({ registry: null, polities: null, borders: null })).toMatch(/^[0-9a-f]{8}$/)
    })

    // The page's fetch drops a leading BOM, Node's read keeps it: both must give one fingerprint (QUAL-002).
    it('gives a file with a leading byte-order mark the fingerprint of the same file without', () => {
      expect(yearStamp({ ...FILES, polities: `\uFEFF${FILES.polities}` })).toBe(yearStamp(FILES))
    })

    it('reads characters past the basic plane like any other', () => {
      expect(yearStamp({ ...FILES, registry: '{"name":"Ῥώμη 𐌀"}' })).not.toBe(yearStamp(FILES))
    })
  })
})
