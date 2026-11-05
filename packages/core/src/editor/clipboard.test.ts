import { describe, expect, it } from 'vitest'

import { copyPoints, copyPolities, copySheet, readClipboard } from './clipboard'
import { sharedBorderDocument } from './documentFixtures'

import type { PointsCopy } from './clipboard'

const EYE = { name: 'reported by eye — Duby (reference)', licence: 'fact' }

/**
 * Each piece of a copy, as whether it is closed and its points' positions.
 * @param copy - what copyPoints answered
 * @returns the pieces, or `null` when nothing was copied
 */
function pieces(copy: PointsCopy): { closed: boolean; at: [number, number][] }[] | null {
  return (
    copy.copy?.pieces.map((piece) => ({
      closed: piece.closed,
      at: piece.points.map((point) => point.at),
    })) ?? null
  )
}

/**
 * The shared-border map with France's outline left open.
 * @returns the map
 */
function franceOpen(): ReturnType<typeof sharedBorderDocument> {
  const doc = sharedBorderDocument()
  const france = doc.claims.find((claim) => claim.polity === 'fr-couronne')
  if (france !== undefined) france.open = [0]
  return doc
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

    it('copies two anchors that follow one another as one piece of the polity aimed at', () => {
      const copy = copyPoints(sharedBorderDocument(), [1, 2], '1100', 'fr-couronne')

      expect(copy).toEqual({
        copy: {
          kind: 'points',
          map: '1100',
          polity: 'Reaume de France',
          pieces: [
            {
              closed: false,
              points: [
                { at: [2, 48], provenance: EYE },
                { at: [2, 46], provenance: EYE },
              ],
            },
          ],
        },
        alone: 0,
      })
    })

    // The dev, 2026-11-05: "it's the points we want" — a whole outline and a part of another, in one copy.
    it('copies the points of a whole outline and of part of another as two pieces', () => {
      const copy = copyPoints(sharedBorderDocument(), [0, 1, 2, 3, 4, 5], '1100', 'fr-couronne')

      expect(pieces(copy)).toEqual([
        {
          closed: true,
          at: [
            [0, 48],
            [2, 48],
            [2, 46],
            [0, 46],
          ],
        },
        {
          closed: false,
          at: [
            [4, 48],
            [4, 46],
          ],
        },
      ])
    })
  })

  describe('variants', () => {
    it('copies every anchor of a ring as a closed piece, from the ring’s first anchor', () => {
      expect(
        pieces(copyPoints(sharedBorderDocument(), [2, 0, 3, 1], '1100', 'fr-couronne'))
      ).toEqual([
        {
          closed: true,
          at: [
            [0, 48],
            [2, 48],
            [2, 46],
            [0, 46],
          ],
        },
      ])
    })

    it('reads back points as they were copied', () => {
      const { copy } = copyPoints(sharedBorderDocument(), [0, 1, 2, 3, 4, 5], '1100', 'fr-couronne')

      expect(readClipboard(JSON.parse(JSON.stringify(copy)))).toEqual(copy)
    })

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

    it('copies a polity’s open outline marked open', () => {
      expect(copyPolities(franceOpen(), ['fr-couronne'], '1100')?.polities[0]?.open).toEqual([0])
    })

    it('names a shared piece after the polity aimed at, read first', () => {
      const copy = copyPoints(sharedBorderDocument(), [1, 2], '1100', 'hre')

      expect(copy.copy?.polity).toBe('Sacrum Imperium')
    })

    it('orders a piece as its ring runs, whatever order the anchors were selected in', () => {
      expect(pieces(copyPoints(sharedBorderDocument(), [2, 1], '1100', 'fr-couronne'))).toEqual([
        {
          closed: false,
          at: [
            [2, 48],
            [2, 46],
          ],
        },
      ])
    })

    it('copies a piece that runs across a closed ring’s first anchor from where it starts', () => {
      expect(pieces(copyPoints(sharedBorderDocument(), [0, 3], '1100', 'fr-couronne'))).toEqual([
        {
          closed: false,
          at: [
            [0, 46],
            [0, 48],
          ],
        },
      ])
    })

    it('never runs a piece across an open outline’s two ends: they are not joined', () => {
      const copy = copyPoints(franceOpen(), [0, 3], '1100', 'fr-couronne')

      expect(copy).toEqual({ copy: null, alone: 2 })
    })

    it('copies every point of an open outline as one piece that is not closed', () => {
      expect(pieces(copyPoints(franceOpen(), [0, 1, 2, 3], '1100', 'fr-couronne'))).toEqual([
        {
          closed: false,
          at: [
            [0, 48],
            [2, 48],
            [2, 46],
            [0, 46],
          ],
        },
      ])
    })

    it('finds the piece on another polity’s ring when none is aimed at', () => {
      expect(copyPoints(sharedBorderDocument(), [4, 5], '1100', null).copy?.polity).toBe(
        'Sacrum Imperium'
      )
    })

    it('copies a run on a ring that passes twice over one anchor, the anchor going to the first piece', () => {
      const doc = sharedBorderDocument()
      const france = doc.claims.find((claim) => claim.polity === 'fr-couronne')
      if (france !== undefined) france.rings = [[0, 1, 2, 1, 3]]

      expect(pieces(copyPoints(doc, [0, 1], '1100', 'fr-couronne'))).toEqual([
        {
          closed: false,
          at: [
            [0, 48],
            [2, 48],
          ],
        },
      ])
    })
  })

  describe('managed errors', () => {
    it('copies nothing when no id names a polity of the map', () => {
      expect(copyPolities(sharedBorderDocument(), ['nowhere'], '1100')).toBeNull()
    })

    it('copies nothing from one point, and counts it alone', () => {
      expect(copyPoints(sharedBorderDocument(), [1], '1100', 'fr-couronne')).toEqual({
        copy: null,
        alone: 1,
      })
    })

    it('leaves out points with no selected neighbour on any outline, and counts them', () => {
      expect(copyPoints(sharedBorderDocument(), [0, 2], '1100', 'fr-couronne')).toEqual({
        copy: null,
        alone: 2,
      })
    })

    it('copies the pieces and counts the point left alone beside them', () => {
      const copy = copyPoints(sharedBorderDocument(), [1, 2, 5], '1100', 'fr-couronne')

      expect(copy.copy?.pieces).toHaveLength(1)
      expect(copy.alone).toBe(1)
    })

    it('reads back nothing from a closed piece of two points, which encloses nothing', () => {
      const bad = {
        kind: 'points',
        map: '1100',
        polity: 'x',
        pieces: [
          {
            closed: true,
            points: [
              { at: [0, 0], provenance: EYE },
              { at: [1, 1], provenance: EYE },
            ],
          },
        ],
      }

      expect(readClipboard(bad)).toBeNull()
    })

    it('reads back an open piece of two points, a line', () => {
      const line = {
        kind: 'points',
        map: '1100',
        polity: 'x',
        pieces: [
          {
            closed: false,
            points: [
              { at: [0, 0], provenance: EYE },
              { at: [1, 1], provenance: EYE },
            ],
          },
        ],
      }

      expect(readClipboard(line)).toEqual(line)
    })

    it('reads back nothing from a value that is not a clipboard', () => {
      expect(readClipboard({ kind: 'stretch', map: '1100', polity: 'x', points: [] })).toBeNull()
    })

    it('reads back nothing from a polity holding a closed ring of two points, which encloses nothing', () => {
      const copy = copyPolities(sharedBorderDocument(), ['fr-couronne'], '1100')
      copy?.polities[0]?.rings[0]?.splice(2)

      expect(readClipboard(JSON.parse(JSON.stringify(copy)))).toBeNull()
    })

    it('reads back a polity holding an open outline of two points', () => {
      const copy = copyPolities(franceOpen(), ['fr-couronne'], '1100')
      copy?.polities[0]?.rings[0]?.splice(2)

      expect(readClipboard(JSON.parse(JSON.stringify(copy)))).toEqual(copy)
    })

    // Review SEC-001, 2026-11-05: the open positions read back as strictly as the year file's.
    it('reads back nothing from a polity whose open positions name no ring, or repeat', () => {
      const past = copyPolities(franceOpen(), ['fr-couronne'], '1100')
      const twice = copyPolities(franceOpen(), ['fr-couronne'], '1100')
      if (past?.polities[0] !== undefined) past.polities[0].open = [3]
      if (twice?.polities[0] !== undefined) twice.polities[0].open = [0, 0]

      expect(readClipboard(JSON.parse(JSON.stringify(past)))).toBeNull()
      expect(readClipboard(JSON.parse(JSON.stringify(twice)))).toBeNull()
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
        kind: 'points',
        map: '1100',
        polity: 'x',
        pieces: [
          {
            closed: false,
            points: [
              { at: [Infinity, 0], provenance: EYE },
              { at: [1, 1], provenance: EYE },
            ],
          },
        ],
      }

      expect(readClipboard(bad)).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('throws rather than name a piece after a polity the registry does not hold', () => {
      const doc = sharedBorderDocument()
      doc.polities = doc.polities.filter((polity) => polity.id !== 'hre')

      expect(() => copyPoints(doc, [4, 5], '1100', null)).toThrow(/names no polity/)
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

  // The dev, 2026-11-05: ‹shift+cmd+C› copies a polity's sheet alone, its outline left behind.
  describe('a sheet alone', () => {
    it('copies a polity’s sheet without its outline, its suzerain by name', () => {
      const doc = sharedBorderDocument()
      const hre = doc.polities.find((polity) => polity.id === 'hre')
      if (hre !== undefined) hre.suzerain = 'fr-couronne'
      const copy = copySheet(doc, 'hre', '1100')

      expect(copy).toEqual({
        kind: 'sheet',
        map: '1100',
        polity: hre,
        suzerainName: 'Reaume de France',
      })
      expect(readClipboard(JSON.parse(JSON.stringify(copy)))).toEqual(copy)
    })

    it('copies nothing for a polity the map does not hold', () => {
      expect(copySheet(sharedBorderDocument(), 'nowhere', '1100')).toBeNull()
    })

    it('reads back nothing from a vassal’s sheet copied without its suzerain’s name', () => {
      const copy = copySheet(sharedBorderDocument(), 'hre', '1100')
      const bad = { ...copy, polity: { ...copy?.polity, suzerain: 'fr-couronne' } }

      expect(readClipboard(JSON.parse(JSON.stringify(bad)))).toBeNull()
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
