import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { formatYearJson } from './yearJson'

describe('formatYearJson', () => {
  describe('happy path', () => {
    it('reads back as exactly the value it was given', () => {
      const files = saveYearDocument(sharedBorderDocument())

      expect(JSON.parse(formatYearJson(files))).toEqual(files)
    })

    it('puts each anchor on one line of its own', () => {
      const text = formatYearJson({
        anchors: [
          [0, 48],
          [2, 48],
        ],
      })

      expect(text).toBe('{\n  "anchors": [\n    [0, 48],\n    [2, 48]\n  ]\n}\n')
    })
  })

  describe('variants', () => {
    it('keeps a ring of indices on one line', () => {
      expect(formatYearJson({ rings: [[0, 1, 2, 3]] })).toContain('[0, 1, 2, 3]')
    })

    it('indents an array of objects one item per line', () => {
      const text = formatYearJson([{ id: 'a' }, { id: 'b' }])

      expect(text).toBe('[\n  {\n    "id": "a"\n  },\n  {\n    "id": "b"\n  }\n]\n')
    })

    it('quotes strings and writes null and booleans as JSON does', () => {
      expect(formatYearJson({ name: 'Reaume "de" France', suzerain: null, ok: true })).toBe(
        '{\n  "name": "Reaume \\"de\\" France",\n  "suzerain": null,\n  "ok": true\n}\n'
      )
    })
  })

  // L3: N/A — nothing is refused here; the endpoint checks the year before it is formatted.

  describe('unmanaged errors', () => {
    it('writes a NaN as null, as JSON.stringify does — which is why the year is checked before, not after', () => {
      // The schemas refuse a null coordinate, so a NaN never reaches this function from the endpoint.
      expect(formatYearJson([Number.NaN])).toBe('[null]\n')
    })
  })

  describe('edge cases', () => {
    it('writes an empty array and an empty object on one line', () => {
      expect(formatYearJson({ years: [], meta: {} })).toBe('{\n  "years": [],\n  "meta": {}\n}\n')
    })

    it('ends every file with a newline', () => {
      expect(formatYearJson(1100).endsWith('\n')).toBe(true)
    })

    it('keeps a mixed array one item per line, the numbers included', () => {
      expect(formatYearJson([1, 'a'])).toBe('[\n  1,\n  "a"\n]\n')
    })
  })
})
