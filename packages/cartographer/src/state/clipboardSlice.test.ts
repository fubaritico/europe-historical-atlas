import { describe, expect, it } from 'vitest'

import { copyPoints, copyPolities, copySheet } from '@europe-historical-atlas/core/editor/clipboard'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { summariseClipboard } from './clipboardSlice'

// CARTO-345: what the clipboard holds, as the menus name it.

describe('summariseClipboard', () => {
  describe('happy path', () => {
    it('names the polities copied, the points’ polity, and a sheet’s', () => {
      const doc = sharedBorderDocument()

      expect(summariseClipboard(copyPolities(doc, ['hre'], 'm'))).toEqual({
        kind: 'polities',
        names: ['Sacrum Imperium'],
        map: 'm',
      })
      expect(summariseClipboard(copyPoints(doc, [1, 2], 'm', 'hre').copy)).toEqual({
        kind: 'points',
        polity: 'Sacrum Imperium',
        map: 'm',
      })
      expect(summariseClipboard(copySheet(doc, 'hre', 'm'))).toEqual({
        kind: 'sheet',
        polity: 'Sacrum Imperium',
        map: 'm',
      })
    })
  })

  describe('managed errors', () => {
    it('names nothing for an empty clipboard', () => {
      expect(summariseClipboard(null)).toBeNull()
    })
  })
})
