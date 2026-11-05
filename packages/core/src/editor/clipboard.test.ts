import { describe, expect, it } from 'vitest'

import { copyPolities, copyStretch, readClipboard } from './clipboard'
import { sharedBorderDocument } from './documentFixtures'

import type { CopiedStretch, StretchRefusal } from './clipboard'

const EYE = { name: 'reported by eye — Duby (reference)', licence: 'fact' }

/**
 * The positions a stretch copy holds, or the refusal it gave.
 * @param copy - what copyStretch answered
 * @returns the points' positions, or the refusal
 */
function positions(copy: CopiedStretch | StretchRefusal): [number, number][] | StretchRefusal {
  return typeof copy === 'string' ? copy : copy.points.map((point) => point.at)
}

describe('clipboard', () => {
  describe('happy path', () => {
    it('copies a polity with its sheet and its ring resolved into points and sources', () => {
      const copy = copyPolities(sharedBorderDocument(), ['fr-couronne'], '1100')

      expect(copy?.map).toBe('1100')
      expect(copy?.polities.map((each) => each.polity.name)).toEqual(['Reaume de France'])
      expect(copy?.polities[0]?.rings).toEqual([
        [
          { at: [0, 48], provenance: EYE },
          { at: [2, 48], provenance: EYE },
          { at: [2, 46], provenance: EYE },
          { at: [0, 46], provenance: EYE },
        ],
      ])
    })

    it('copies two anchors that follow one another as a stretch of the polity aimed at', () => {
      const copy = copyStretch(sharedBorderDocument(), [1, 2], '1100', 'fr-couronne')

      expect(copy).toEqual({
        kind: 'stretch',
        map: '1100',
        polity: 'Reaume de France',
        points: [
          { at: [2, 48], provenance: EYE },
          { at: [2, 46], provenance: EYE },
        ],
      })
    })
  })

  describe('variants', () => {
    it('copies several polities in the order the map lists them, not the order selected', () => {
      const copy = copyPolities(sharedBorderDocument(), ['hre', 'fr-couronne'], '1100')

      expect(copy?.polities.map((each) => each.polity.id)).toEqual(['fr-couronne', 'hre'])
    })

    it('copies a vassal with its suzerain’s name, and a sovereign with none', () => {
      const doc = sharedBorderDocument()
      const hre = doc.polities.find((polity) => polity.id === 'hre')
      if (hre !== undefined) hre.suzerain = 'fr-couronne'
      const copy = copyPolities(doc, ['fr-couronne', 'hre'], '1100')

      expect(copy?.polities.map((each) => each.suzerainName)).toEqual([null, 'Reaume de France'])
    })

    it('copies a polity with no territory with no ring', () => {
      const doc = sharedBorderDocument()
      doc.claims = doc.claims.filter((claim) => claim.polity !== 'hre')

      expect(copyPolities(doc, ['hre'], '1100')?.polities[0]?.rings).toEqual([])
    })

    it('names a shared stretch after the polity aimed at, searched first', () => {
      const copy = copyStretch(sharedBorderDocument(), [1, 2], '1100', 'hre')

      expect(copy).toMatchObject({ kind: 'stretch', polity: 'Sacrum Imperium' })
    })

    it('orders a stretch as its ring runs, whatever order the anchors were selected in', () => {
      const copy = copyStretch(sharedBorderDocument(), [2, 1], '1100', 'fr-couronne')

      expect(positions(copy)).toEqual([
        [2, 48],
        [2, 46],
      ])
    })

    it('copies a stretch that runs across the ring’s first anchor from where it starts', () => {
      const copy = copyStretch(sharedBorderDocument(), [0, 3], '1100', 'fr-couronne')

      expect(positions(copy)).toEqual([
        [0, 46],
        [0, 48],
      ])
    })

    it('finds the stretch on another polity’s ring when none is aimed at', () => {
      const copy = copyStretch(sharedBorderDocument(), [4, 5], '1100', null)

      expect(copy).toMatchObject({ kind: 'stretch', polity: 'Sacrum Imperium' })
    })
  })

  describe('managed errors', () => {
    it('copies nothing when no id names a polity of the map', () => {
      expect(copyPolities(sharedBorderDocument(), ['nowhere'], '1100')).toBeNull()
    })

    it('refuses one anchor as too few for a stretch', () => {
      expect(copyStretch(sharedBorderDocument(), [1], '1100', 'fr-couronne')).toBe('too-few')
    })

    it('refuses two anchors of a ring that do not follow one another', () => {
      expect(copyStretch(sharedBorderDocument(), [0, 2], '1100', 'fr-couronne')).toBe('not-a-run')
    })

    it('refuses anchors that lie on no single ring', () => {
      expect(copyStretch(sharedBorderDocument(), [0, 4], '1100', null)).toBe('not-a-run')
    })

    it('refuses a whole ring, which is the polity’s outline', () => {
      expect(copyStretch(sharedBorderDocument(), [0, 1, 2, 3], '1100', 'fr-couronne')).toBe(
        'whole-ring'
      )
    })

    it('reads back nothing from a value that is not a clipboard', () => {
      expect(readClipboard({ kind: 'stretch', map: '1100', polity: 'x', points: [] })).toBeNull()
    })

    it('reads back nothing from a polity holding a ring of two points, which encloses nothing', () => {
      const copy = copyPolities(sharedBorderDocument(), ['fr-couronne'], '1100')
      copy?.polities[0]?.rings[0]?.splice(2)

      expect(readClipboard(JSON.parse(JSON.stringify(copy)))).toBeNull()
    })

    it('reads back nothing from a vassal copied without its suzerain’s name', () => {
      const doc = sharedBorderDocument()
      const hre = doc.polities.find((polity) => polity.id === 'hre')
      if (hre !== undefined) hre.suzerain = 'fr-couronne'
      const copy = copyPolities(doc, ['hre'], '1100')
      if (copy?.polities[0] !== undefined) copy.polities[0].suzerainName = null

      expect(readClipboard(JSON.parse(JSON.stringify(copy)))).toBeNull()
    })

    it('reads back nothing from a point that is not finite', () => {
      const bad = {
        kind: 'stretch',
        map: '1100',
        polity: 'x',
        points: [
          { at: [Infinity, 0], provenance: EYE },
          { at: [1, 1], provenance: EYE },
        ],
      }

      expect(readClipboard(bad)).toBeNull()
    })
  })

  describe('managed errors — selections that are no stretch', () => {
    it('refuses two selections of one anchor as too few', () => {
      expect(copyStretch(sharedBorderDocument(), [1, 1], '1100', 'fr-couronne')).toBe('too-few')
    })

    it('refuses a run on a ring that passes twice over one anchor, whose order cannot be told', () => {
      const doc = sharedBorderDocument()
      const france = doc.claims.find((claim) => claim.polity === 'fr-couronne')
      if (france !== undefined) france.rings = [[0, 1, 2, 1, 3]]

      expect(copyStretch(doc, [0, 1], '1100', 'fr-couronne')).toBe('not-a-run')
    })
  })

  describe('unmanaged errors', () => {
    it('throws rather than name a stretch after a polity the registry does not hold', () => {
      const doc = sharedBorderDocument()
      doc.polities = doc.polities.filter((polity) => polity.id !== 'hre')

      expect(() => copyStretch(doc, [4, 5], '1100', null)).toThrow(/names no polity/)
    })

    it('throws rather than copy a vassal whose suzerain the registry does not hold', () => {
      const doc = sharedBorderDocument()
      const hre = doc.polities.find((polity) => polity.id === 'hre')
      if (hre !== undefined) hre.suzerain = 'nowhere'

      expect(() => copyPolities(doc, ['hre'], '1100')).toThrow(/"nowhere" names no polity/)
    })

    it('throws rather than copy a point whose source the map does not declare', () => {
      const doc = sharedBorderDocument()
      doc.anchorSource[1] = 9

      expect(() => copyPolities(doc, ['fr-couronne'], '1100')).toThrow(/anchor 1 cannot be copied/)
    })
  })

  describe('edge cases', () => {
    it('copies the sheet, so changing the copy leaves the map’s polity as it was', () => {
      const doc = sharedBorderDocument()
      const copy = copyPolities(doc, ['fr-couronne'], '1100')
      if (copy?.polities[0] !== undefined) copy.polities[0].polity.name = 'changed'

      expect(doc.polities[0]?.name).toBe('Reaume de France')
    })

    it('reads back exactly what was copied, through the text the tab keeps', () => {
      const copy = copyPolities(sharedBorderDocument(), ['fr-couronne', 'hre'], '1100')

      expect(readClipboard(JSON.parse(JSON.stringify(copy)))).toEqual(copy)
    })
  })
})
