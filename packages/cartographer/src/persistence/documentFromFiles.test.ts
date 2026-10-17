import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { documentFromFiles } from './yearArchive'

describe('documentFromFiles', () => {
  describe('happy path', () => {
    it('opens the three files a save wrote as the same document, sharing kept', () => {
      const original = sharedBorderDocument()

      const reopened = documentFromFiles(saveYearDocument(original), 'the draft of 1100')

      expect(reopened.year).toBe(original.year)
      expect(reopened.polities.map((polity) => polity.id)).toEqual(
        original.polities.map((polity) => polity.id)
      )
      expect(reopened.anchors.length).toBe(saveYearDocument(original).polities.anchors.length)
    })
  })

  // L2: N/A — one input shape, the three files; the variants are the failures below.

  describe('managed errors', () => {
    it('refuses a registry the schema rejects, naming where it came from', () => {
      const files = { ...saveYearDocument(sharedBorderDocument()), registry: { version: 99 } }

      expect(() => documentFromFiles(files, 'the draft of 1100')).toThrow(/the draft of 1100/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses something that is not an object at all', () => {
      expect(() => documentFromFiles('not files', 'the draft of 1100')).toThrow()
    })

    it('refuses null', () => {
      expect(() => documentFromFiles(null, 'the draft of 1100')).toThrow()
    })
  })

  describe('edge cases', () => {
    it('refuses files missing one of the three', () => {
      const { registry, polities } = saveYearDocument(sharedBorderDocument())

      expect(() => documentFromFiles({ registry, polities }, 'the draft of 1100')).toThrow()
    })
  })
})
