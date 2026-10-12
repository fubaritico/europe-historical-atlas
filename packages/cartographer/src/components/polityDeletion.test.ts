import { describe, expect, it } from 'vitest'

import {
  AQUITAINE_IDENTITY,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'

import { deletionQuestion, deletionResult, pendingDeletion } from './polityDeletion'

/** The fixture year with Aquitaine holding from France. */
function withVassal() {
  const document = sharedBorderDocument()
  document.polities.push({ ...AQUITAINE_IDENTITY, suzerain: 'fr-couronne' })
  return document
}

describe('polityDeletion', () => {
  describe('happy path', () => {
    it('reads what deleting a polity takes: its rings and its vassals', () => {
      expect(pendingDeletion(withVassal(), 'fr-couronne')).toEqual({
        id: 'fr-couronne',
        name: 'Reaume de France',
        rings: 1,
        vassals: 1,
      })
    })

    it('asks the question s07 writes', () => {
      expect(
        deletionQuestion({ id: 'normandie', name: 'Duchy of Normandy', rings: 3, vassals: 2 })
      ).toBe('Delete Duchy of Normandy? Its 3 rings go; its 2 vassals become sovereign.')
    })
  })

  describe('variants', () => {
    it('speaks in the singular for one ring and one vassal', () => {
      expect(deletionQuestion({ id: 'fr', name: 'Reaume de France', rings: 1, vassals: 1 })).toBe(
        'Delete Reaume de France? Its 1 ring goes; its 1 vassal becomes sovereign.'
      )
    })

    it('says nothing of vassals when there are none', () => {
      expect(deletionQuestion({ id: 'hre', name: 'Sacrum Imperium', rings: 1, vassals: 0 })).toBe(
        'Delete Sacrum Imperium? Its 1 ring goes.'
      )
    })

    it('says the result, and that undo brings it back', () => {
      const pending = { id: 'fr', name: 'Reaume de France', rings: 1, vassals: 2 }

      expect(
        deletionResult(pending, { rings: 1, anchorsKept: 2, anchorsOrphaned: 2, bordersDropped: 0 })
      ).toBe('deleted Reaume de France — 1 ring, 2 vassals now sovereign · ctrl+Z brings it back')
    })
  })

  describe('managed errors', () => {
    it('reads nothing for an id the year does not hold', () => {
      expect(pendingDeletion(sharedBorderDocument(), 'nobody')).toBeNull()
    })
  })

  // L4: N/A — pure reading and sentence building.

  describe('edge cases', () => {
    it('asks by name alone for a polity with no territory and no vassal', () => {
      expect(deletionQuestion({ id: 'aq', name: 'Aquitaine', rings: 0, vassals: 0 })).toBe(
        'Delete Aquitaine?'
      )
    })

    it('names only the vassals for a polity with no territory', () => {
      expect(deletionQuestion({ id: 'fr', name: 'Reaume de France', rings: 0, vassals: 2 })).toBe(
        'Delete Reaume de France? Its 2 vassals become sovereign.'
      )
    })

    it('counts only the direct vassals — they are the ones freed', () => {
      const document = withVassal()
      document.polities.push({ ...AQUITAINE_IDENTITY, id: 'poitou', suzerain: 'aquitaine' })

      expect(pendingDeletion(document, 'fr-couronne')?.vassals).toBe(1)
    })
  })
})
