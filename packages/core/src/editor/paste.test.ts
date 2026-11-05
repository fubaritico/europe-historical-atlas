import { describe, expect, it } from 'vitest'

import { MAX_HOMAGE_DEPTH } from '../data/paintOrder'

import { copyPolities, readClipboard } from './clipboard'
import {
  AQUITAINE_IDENTITY,
  ringOf,
  sharedAnchorsBetween,
  sharedBorderDocument,
} from './documentFixtures'
import { isPolityPasteRefusal, pastePolity } from './paste'
import { PASTE_WELD_KM } from './pasteWeld'
import { cloneYearDocument, createYearDocument } from './yearDocument'

import type { CopiedPolity } from './clipboard'
import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'

// s22-copy-paste.md, « # 1 — a whole polity ».

const EYE = { name: 'reported by eye — Duby (reference)', licence: 'fact' }
const COAST = { name: 'Natural Earth 10m land minus lakes', licence: 'public domain' }
/** The application's weld distance: the fixtures' points lie degrees apart, beyond it. */
const KM = PASTE_WELD_KM

/**
 * France copied from the fixture map.
 * @returns the copied polity
 */
function copiedFrance(): CopiedPolity {
  const copy = copyPolities(sharedBorderDocument(), ['fr-couronne'], '1100')?.polities[0]
  if (copy === undefined) throw new Error('fixture: France was not copied')
  return copy
}

/**
 * A copied polity with one square ring, its sheet changed by `sheet`.
 * @param sheet - the fields that differ from Aquitaine's identity
 * @param suzerainName - the name of its suzerain in the source map
 * @returns the copied polity
 */
function copiedSquare(sheet: Partial<YearPolity>, suzerainName: string | null): CopiedPolity {
  return {
    polity: { ...AQUITAINE_IDENTITY, ...sheet },
    suzerainName,
    rings: [
      [
        { at: [10, 40], provenance: COAST },
        { at: [11, 40], provenance: COAST },
        { at: [11, 39], provenance: EYE },
      ],
    ],
  }
}

/**
 * A map holding one chain of homage `MAX_HOMAGE_DEPTH` deep, its last link `link-<depth>`.
 * @returns the map
 */
function deepChain(): YearDocument {
  const doc = createYearDocument(1100)
  for (let depth = 0; depth <= MAX_HOMAGE_DEPTH; depth += 1) {
    doc.polities.push({
      ...AQUITAINE_IDENTITY,
      id: `link-${String(depth)}`,
      name: `Link ${String(depth)}`,
      suzerain: depth === 0 ? null : `link-${String(depth - 1)}`,
    })
  }
  return doc
}

describe('pastePolity', () => {
  describe('happy path', () => {
    it('pastes a polity into a map started empty, its sheet as copied and its ring in place', () => {
      const doc = createYearDocument(1200)
      const result = pastePolity(doc, copiedFrance(), KM)

      expect(result).toEqual({ id: 'fr-couronne', points: 4, welded: 0, sovereignWithout: null })
      expect(doc.polities).toEqual([copiedFrance().polity])
      expect(ringOf(doc, 'fr-couronne')).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
      ])
    })

    it('puts the pasted polity at the end of the list, so at the top of {Polities}', () => {
      const doc = sharedBorderDocument()
      pastePolity(doc, copiedSquare({}, 'Reaume de France'), KM)

      expect(doc.polities.map((polity) => polity.id)).toEqual(['fr-couronne', 'hre', 'aquitaine'])
    })

    it('welds the pasted outline onto its neighbour: they share the points they meet on, and it says how many', () => {
      const doc = sharedBorderDocument()
      const copy = copiedSquare({ suzerain: null }, null)
      copy.rings = [
        [
          { at: [4.01, 48], provenance: EYE },
          { at: [6, 48], provenance: EYE },
          { at: [6, 46], provenance: EYE },
          { at: [4.01, 46], provenance: EYE },
        ],
      ]
      const result = pastePolity(doc, copy, KM)

      expect(result).toMatchObject({ points: 4, welded: 2 })
      expect(sharedAnchorsBetween(doc, 'aquitaine', 'hre')).toEqual([4, 5])
    })
  })

  describe('variants', () => {
    it('declares in the target map a source it did not have, and records each point under its own', () => {
      const doc = createYearDocument(1200, [{ id: 0, name: 'Cliopatria', licence: 'CC BY 4.0' }])
      pastePolity(doc, copiedSquare({ suzerain: null }, null), KM)

      expect(doc.sources.map((source) => source.name)).toEqual(['Cliopatria', COAST.name, EYE.name])
      expect(doc.anchorSource).toEqual([1, 1, 2])
    })

    it('records a point under the target map’s own declaration of its source, declaring nothing twice', () => {
      const doc = sharedBorderDocument()
      pastePolity(doc, copiedSquare({ suzerain: null, name: 'Gascogne', id: 'gascogne' }, null), KM)

      expect(doc.sources).toHaveLength(2)
      expect(doc.anchorSource.slice(-1)).toEqual([0])
    })

    it('gives the pasted polity the first free id when its own is another polity’s of the map', () => {
      const doc = sharedBorderDocument()
      doc.polities.push({ ...AQUITAINE_IDENTITY, id: 'fr-couronne-2', name: 'Another' })
      const result = pastePolity(doc, copiedSquare({ id: 'fr-couronne', suzerain: null }, null), KM)

      expect(result).toMatchObject({ id: 'fr-couronne-3' })
      expect(doc.claims.at(-1)?.polity).toBe('fr-couronne-3')
    })

    it('keeps the suzerain when the target map holds it, as a vassal of that polity', () => {
      const doc = sharedBorderDocument()
      const result = pastePolity(doc, copiedSquare({}, 'Reaume de France'), KM)

      expect(result).toMatchObject({ sovereignWithout: null })
      expect(doc.polities.at(-1)?.suzerain).toBe('fr-couronne')
    })

    it('pastes as sovereign a polity whose suzerain the target map does not hold, and names that suzerain', () => {
      const doc = createYearDocument(1200)
      const result = pastePolity(doc, copiedSquare({}, 'Reaume de France'), KM)

      expect(result).toMatchObject({ sovereignWithout: 'Reaume de France' })
      expect(doc.polities[0]?.suzerain).toBeNull()
    })

    it('finds the suzerain by its name when the target map holds it under another id', () => {
      const doc = sharedBorderDocument()
      const result = pastePolity(
        doc,
        copiedSquare({ suzerain: 'kingdom-of-france' }, 'Reaume de France'),
        KM
      )

      expect(result).toMatchObject({ sovereignWithout: null })
      expect(doc.polities.at(-1)?.suzerain).toBe('fr-couronne')
    })

    it('pastes as sovereign a vassal whose suzerain’s id is another polity’s of the target map', () => {
      const doc = sharedBorderDocument()
      const result = pastePolity(doc, copiedSquare({ suzerain: 'hre' }, 'Holy Roman Empire'), KM)

      expect(result).toMatchObject({ sovereignWithout: 'Holy Roman Empire' })
      expect(doc.polities.at(-1)?.suzerain).toBeNull()
    })

    it('keeps a tribe’s rank and dates a year leaves out, as copied, saying nothing about them', () => {
      const doc = createYearDocument(1100)
      pastePolity(doc, copiedSquare({ rank: 'tribe', existsFrom: 1120, suzerain: null }, null), KM)

      expect(doc.polities[0]).toMatchObject({ rank: 'tribe', existsFrom: 1120 })
    })

    it('pastes every ring of a polity held in several pieces', () => {
      const doc = createYearDocument(1200)
      const copy = copiedSquare({ suzerain: null }, null)
      copy.rings.push([
        { at: [20, 40], provenance: EYE },
        { at: [21, 40], provenance: EYE },
        { at: [21, 39], provenance: EYE },
      ])
      const result = pastePolity(doc, copy, KM)

      expect(result).toMatchObject({ points: 6 })
      expect(doc.claims[0]?.rings).toEqual([
        [0, 1, 2],
        [3, 4, 5],
      ])
    })

    it('pastes a polity with no territory as a sheet alone', () => {
      const doc = createYearDocument(1200)
      const result = pastePolity(doc, { ...copiedSquare({ suzerain: null }, null), rings: [] }, KM)

      expect(result).toMatchObject({ points: 0 })
      expect(doc.polities).toHaveLength(1)
      expect(doc.claims).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('refuses a polity whose name the map already holds, and writes nothing', () => {
      const doc = sharedBorderDocument()
      const before = cloneYearDocument(doc)
      const result = pastePolity(
        doc,
        copiedSquare({ name: 'Reaume de France' }, 'Reaume de France'),
        KM
      )

      expect(result).toEqual({ refused: 'name-taken' })
      expect(doc).toEqual(before)
    })

    it('refuses a vassal its suzerain would seat deeper than a map allows, and writes nothing', () => {
      const doc = deepChain()
      const before = cloneYearDocument(doc)
      const deepest = `Link ${String(MAX_HOMAGE_DEPTH)}`
      const result = pastePolity(doc, copiedSquare({ suzerain: 'elsewhere' }, deepest), KM)

      expect(result).toEqual({ refused: 'homage' })
      expect(doc).toEqual(before)
    })

    it('tells a refusal from a paste', () => {
      expect(isPolityPasteRefusal({ refused: 'name-taken' })).toBe(true)
      expect(isPolityPasteRefusal({ id: 'x', points: 0, welded: 0, sovereignWithout: null })).toBe(
        false
      )
    })
  })

  describe('unmanaged errors', () => {
    it('throws on a ring of two points before writing anything', () => {
      const doc = createYearDocument(1200)
      const copy = copiedSquare({ suzerain: null }, null)
      copy.rings[0]?.pop()

      expect(() => pastePolity(doc, copy, KM)).toThrow(/fewer than 3 points/)
      expect(doc.polities).toEqual([])
    })

    it('throws on a vassal copied without its suzerain’s name before writing anything', () => {
      const doc = createYearDocument(1200)

      expect(() => pastePolity(doc, copiedSquare({}, null), KM)).toThrow(/without its name/)
      expect(doc.polities).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('refuses the second paste of one polity, its name being in the map since the first', () => {
      const doc = createYearDocument(1200)
      pastePolity(doc, copiedFrance(), KM)

      expect(pastePolity(doc, copiedFrance(), KM)).toEqual({ refused: 'name-taken' })
    })

    it('pastes a name written otherwise as another polity', () => {
      const doc = sharedBorderDocument()
      const result = pastePolity(
        doc,
        copiedSquare({ name: 'Royaume de France', suzerain: null }, null),
        KM
      )

      expect(isPolityPasteRefusal(result)).toBe(false)
    })

    it('pastes what was read back through the text the tab keeps', () => {
      const copy = copyPolities(sharedBorderDocument(), ['fr-couronne'], '1100')
      const read = readClipboard(JSON.parse(JSON.stringify(copy)))
      const doc = createYearDocument(1200)
      if (read?.kind !== 'polities' || read.polities[0] === undefined)
        throw new Error('not read back')

      expect(pastePolity(doc, read.polities[0], KM)).toMatchObject({ id: 'fr-couronne', points: 4 })
    })
  })
})
