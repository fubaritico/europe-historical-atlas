import { describe, expect, it } from 'vitest'

import { cloneYearDocument } from '../data/yearDocument'

import { copyPolities } from './clipboard'
import { AQUITAINE_IDENTITY, sharedBorderDocument } from './documentFixtures'
import { pasteSheet, sheetDifferences } from './pasteSheet'

import type { CopiedPolity } from './clipboard'

// s22-copy-paste.md, « # 3 — a sheet onto an existing polity ». The fixture holds France and the Empire; the copy is
// France's sheet, changed, as it might stand in another map.

/**
 * France's sheet as another map has it: another rank, a colour, dates.
 * @param changes - what differs from the fixture's France
 * @returns the copied polity
 */
function franceElsewhere(changes: Partial<CopiedPolity['polity']> = {}): CopiedPolity {
  const copied = copyPolities(sharedBorderDocument(), ['fr-couronne'], '1100-backup')?.polities[0]
  if (copied === undefined) throw new Error('fixture: nothing copied')
  return { ...copied, polity: { ...copied.polity, ...changes } }
}

describe('pasteSheet', () => {
  describe('happy path', () => {
    it('lists the fields that differ, the polity’s value and the copied one', () => {
      const lines = sheetDifferences(
        sharedBorderDocument(),
        franceElsewhere({ rank: 'duchy', colour: '#aa3322', existsFrom: 1000 }),
        'fr-couronne'
      )

      expect(lines?.map((line) => [line.field, line.current, line.copied, line.offered])).toEqual([
        ['rank', 'kingdom', 'duchy', true],
        ['existsFrom', 987, 1000, true],
        ['colour', null, '#aa3322', true],
      ])
    })

    it('pastes the fields chosen, the others, the id and the outline kept', () => {
      const doc = sharedBorderDocument()
      const rings = structuredClone(doc.claims[0]?.rings)
      const copied = franceElsewhere({
        rank: 'duchy',
        colour: '#aa3322',
        name: 'Royaume de France',
      })

      expect(pasteSheet(doc, copied, 'fr-couronne', ['rank', 'colour'])).toBe(true)
      expect(doc.polities[0]).toMatchObject({
        id: 'fr-couronne',
        name: 'Reaume de France',
        rank: 'duchy',
        colour: '#aa3322',
      })
      expect(doc.claims[0]?.rings).toEqual(rings)
    })
  })

  describe('variants', () => {
    it('takes the suzerain by its name in the map', () => {
      const doc = sharedBorderDocument()
      const copied = {
        ...franceElsewhere(),
        polity: { ...franceElsewhere().polity, suzerain: 'x' },
        suzerainName: 'Sacrum Imperium',
      }

      expect(pasteSheet(doc, copied, 'fr-couronne', ['suzerain'])).toBe(true)
      expect(doc.polities[0]?.suzerain).toBe('hre')
    })

    it('shows, and does not offer, a suzerain the map does not hold', () => {
      const copied = {
        ...franceElsewhere(),
        polity: { ...franceElsewhere().polity, suzerain: 'x' },
        suzerainName: 'Nowhere',
      }
      const lines = sheetDifferences(sharedBorderDocument(), copied, 'fr-couronne')

      expect(lines).toEqual([
        { field: 'suzerain', current: null, copied: 'Nowhere', offered: false },
      ])
    })

    it('takes the short name and its pin, or drops them', () => {
      const doc = sharedBorderDocument()

      expect(
        pasteSheet(
          doc,
          franceElsewhere({ shortName: 'France', forceShortName: true }),
          'fr-couronne',
          ['shortName', 'forceShortName']
        )
      ).toBe(true)
      expect(doc.polities[0]).toMatchObject({ shortName: 'France', forceShortName: true })
    })
  })

  // Review QUAL-001, 2026-11-05: a sheet without a short name takes it away; a free name is taken.
  describe('what a sheet takes away', () => {
    it('drops the short name and its pin when the copied sheet has neither', () => {
      const doc = sharedBorderDocument()
      const france = doc.polities[0]
      if (france !== undefined) {
        france.shortName = 'France'
        france.forceShortName = true
      }

      expect(
        pasteSheet(doc, franceElsewhere(), 'fr-couronne', ['shortName', 'forceShortName'])
      ).toBe(true)
      expect(doc.polities[0]).not.toHaveProperty('shortName')
      expect(doc.polities[0]).not.toHaveProperty('forceShortName')
    })

    it('takes a name no other polity of the map bears', () => {
      const doc = sharedBorderDocument()

      expect(
        pasteSheet(doc, franceElsewhere({ name: 'Royaume de France' }), 'fr-couronne', ['name'])
      ).toBe(true)
      expect(doc.polities[0]?.name).toBe('Royaume de France')
    })
  })

  describe('managed errors', () => {
    it('lists nothing when the sheets are the same', () => {
      expect(sheetDifferences(sharedBorderDocument(), franceElsewhere(), 'fr-couronne')).toEqual([])
    })

    it('answers nothing for a polity the map does not hold', () => {
      expect(sheetDifferences(sharedBorderDocument(), franceElsewhere(), 'nowhere')).toBeNull()
      expect(pasteSheet(sharedBorderDocument(), franceElsewhere(), 'nowhere', ['rank'])).toBe(
        'no-polity'
      )
    })

    it('refuses a name another polity of the map bears, writing nothing', () => {
      const doc = sharedBorderDocument()
      const before = cloneYearDocument(doc)

      expect(
        pasteSheet(doc, franceElsewhere({ name: 'Sacrum Imperium' }), 'fr-couronne', ['name'])
      ).toBe('name-taken')
      expect(doc).toEqual(before)
    })

    it('refuses a suzerain that would close a loop of homage, writing nothing', () => {
      const doc = sharedBorderDocument()
      const empire = doc.polities.find((polity) => polity.id === 'hre')
      if (empire !== undefined) empire.suzerain = 'fr-couronne'
      const before = cloneYearDocument(doc)
      const copied = {
        ...franceElsewhere(),
        polity: { ...franceElsewhere().polity, suzerain: 'x' },
        suzerainName: 'Sacrum Imperium',
      }

      expect(pasteSheet(doc, copied, 'fr-couronne', ['suzerain'])).toBe('homage')
      expect(doc).toEqual(before)
    })

    it('leaves a field not offered as it is, even chosen', () => {
      const doc = sharedBorderDocument()
      const copied = {
        ...franceElsewhere(),
        polity: { ...franceElsewhere().polity, suzerain: 'x' },
        suzerainName: 'Nowhere',
      }

      expect(pasteSheet(doc, copied, 'fr-couronne', ['suzerain'])).toBe(true)
      expect(doc.polities[0]?.suzerain).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('never offers the id, whatever the copy says', () => {
      const lines = sheetDifferences(
        sharedBorderDocument(),
        franceElsewhere({ id: 'elsewhere' }),
        'fr-couronne'
      )

      expect(lines).toEqual([])
      expect(AQUITAINE_IDENTITY.id).not.toBe('fr-couronne')
    })
  })
})
