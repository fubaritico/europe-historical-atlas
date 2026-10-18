import { describe, expect, it } from 'vitest'

import { addAnchor, addPolity, closeRing } from './documentEdits'
import { extentMembers, extentOutline, hasExtent } from './extent'
import { createYearDocument } from './yearDocument'

import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'

const source = [{ id: 0, name: 'reported by eye', licence: 'fact' }]

function polity(id: string, suzerain: string | null = null): YearPolity {
  return {
    id,
    name: id,
    rank: null,
    status: null,
    suzerain,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
}

/** A square of side 10 whose south-west corner is `[x, y]`, its corners added as anchors. */
function square(doc: YearDocument, x: number, y: number): number[] {
  return [
    [x, y + 10],
    [x + 10, y + 10],
    [x + 10, y],
    [x, y],
  ].map((point) => addAnchor(doc, point as [number, number], 0))
}

/** Every segment of an outline, as sorted `low:high` keys. */
function segments(runs: number[][]): string[] {
  const keys = runs.flatMap((run) =>
    run.slice(1).map((to, at) => {
      const from = run[at] ?? -1
      return `${String(Math.min(from, to))}:${String(Math.max(from, to))}`
    })
  )
  return [...new Set(keys)].sort()
}

/**
 * France `0 1 2 3` and Aquitaine `1 4 5 2` side by side, sharing the segment 1–2; Castile `4 6 7 5` beyond
 * Aquitaine, sharing 4–5 with it.
 */
function franceAquitaineCastile(): YearDocument {
  const doc = createYearDocument(1100, source)
  for (const point of [
    [0, 10],
    [10, 10],
    [10, 0],
    [0, 0],
    [20, 10],
    [20, 0],
    [30, 10],
    [30, 0],
  ] as [number, number][])
    addAnchor(doc, point, 0)
  addPolity(doc, polity('france'))
  addPolity(doc, polity('aquitaine', 'france'))
  addPolity(doc, polity('castile'))
  closeRing(doc, 'france', [0, 1, 2, 3])
  closeRing(doc, 'aquitaine', [1, 4, 5, 2])
  closeRing(doc, 'castile', [4, 6, 7, 5])
  return doc
}

describe('extentMembers', () => {
  it('lists the polity first, then its vassals at any depth', () => {
    const doc = createYearDocument(1100, source)
    addPolity(doc, polity('france'))
    addPolity(doc, polity('aquitaine', 'france'))
    addPolity(doc, polity('poitou', 'aquitaine'))
    addPolity(doc, polity('castile'))
    expect(extentMembers(doc, 'france')).toEqual(['france', 'aquitaine', 'poitou'])
  })
})

describe('hasExtent', () => {
  describe('happy path', () => {
    it('is true for a polity holding a ring of its own', () => {
      expect(hasExtent(franceAquitaineCastile(), 'castile')).toBe(true)
    })
  })

  describe('variants', () => {
    it('is true for a suzerain with no ring of its own whose vassal holds one', () => {
      const doc = createYearDocument(1100, source)
      addPolity(doc, polity('hre'))
      addPolity(doc, polity('saxony', 'hre'))
      closeRing(doc, 'saxony', square(doc, 0, 0))
      expect(hasExtent(doc, 'hre')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('is false for a polity with nothing drawn, itself or below', () => {
      const doc = createYearDocument(1100, source)
      addPolity(doc, polity('hre'))
      addPolity(doc, polity('saxony', 'hre'))
      expect(hasExtent(doc, 'hre')).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('ends on a loop of homage rather than spinning', () => {
      const doc = createYearDocument(1100, source)
      addPolity(doc, polity('a', 'b'))
      addPolity(doc, polity('b', 'a'))
      closeRing(doc, 'b', square(doc, 0, 0))
      expect(hasExtent(doc, 'a')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('does not count a vassal’s ground for its suzerain’s sibling', () => {
      const doc = createYearDocument(1100, source)
      addPolity(doc, polity('france'))
      addPolity(doc, polity('england'))
      addPolity(doc, polity('normandy', 'france'))
      closeRing(doc, 'normandy', square(doc, 0, 0))
      expect(hasExtent(doc, 'england')).toBe(false)
    })
  })
})

describe('extentOutline', () => {
  describe('happy path', () => {
    it('drops the limit between a suzerain and its vassal and keeps everything around them', () => {
      expect(segments(extentOutline(franceAquitaineCastile(), 'france'))).toEqual([
        '0:1',
        '0:3',
        '1:4',
        '2:3',
        '2:5',
        '4:5',
      ])
    })
  })

  describe('variants', () => {
    it('keeps the vassal’s limit against a foreign polity, as the suzerain’s own', () => {
      expect(segments(extentOutline(franceAquitaineCastile(), 'france'))).toContain('4:5')
    })

    it('outlines a suzerain with no ring of its own by its vassals alone', () => {
      const doc = franceAquitaineCastile()
      doc.claims = doc.claims.filter((claim) => claim.polity !== 'france')
      expect(segments(extentOutline(doc, 'france'))).toEqual(['1:2', '1:4', '2:5', '4:5'])
    })

    it('takes a rear-vassal’s ground into the extent', () => {
      const doc = franceAquitaineCastile()
      addPolity(doc, polity('poitou', 'aquitaine'))
      // Castile's ground handed to Poitou: the Aquitaine–Poitou limit is now inside France's extent.
      doc.claims = doc.claims.map((claim) =>
        claim.polity === 'castile' ? { ...claim, polity: 'poitou' } : claim
      )
      expect(segments(extentOutline(doc, 'france'))).toEqual([
        '0:1',
        '0:3',
        '1:4',
        '2:3',
        '2:5',
        '4:6',
        '5:7',
        '6:7',
      ])
    })

    // The hand correction of 2026-10-15: France still drawn under Aquitaine, sharing not one anchor.
    it('leaves out a suzerain’s ring still lying under its vassal, while the author corrects it', () => {
      const doc = createYearDocument(1100, source)
      addPolity(doc, polity('france'))
      addPolity(doc, polity('aquitaine', 'france'))
      const outer = [
        [0, 20],
        [20, 20],
        [20, 0],
        [0, 0],
      ].map((point) => addAnchor(doc, point as [number, number], 0))
      closeRing(doc, 'france', outer)
      closeRing(doc, 'aquitaine', square(doc, 5, 5))
      expect(segments(extentOutline(doc, 'france'))).toEqual(['0:1', '0:3', '1:2', '2:3'])
    })
  })

  describe('managed errors', () => {
    it('is empty for a polity with nothing drawn', () => {
      const doc = createYearDocument(1100, source)
      addPolity(doc, polity('hre'))
      expect(extentOutline(doc, 'hre')).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('skips a segment whose anchor is missing rather than throwing', () => {
      const doc = franceAquitaineCastile()
      doc.claims.push({ polity: 'france', rings: [[0, 3, 99]] })
      expect(() => extentOutline(doc, 'france')).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('ignores a ring too small to enclose an area', () => {
      const doc = franceAquitaineCastile()
      doc.claims.push({ polity: 'france', rings: [[6, 7]] })
      expect(segments(extentOutline(doc, 'france'))).not.toContain('6:7')
    })

    it('keeps both banks of a channel narrower than the derivation’s far-side step', () => {
      const doc = createYearDocument(1100, source)
      addPolity(doc, polity('venice'))
      addPolity(doc, polity('croatia'))
      closeRing(doc, 'croatia', square(doc, 0, 0))
      closeRing(doc, 'venice', square(doc, 0, -10.02))
      expect(segments(extentOutline(doc, 'croatia'))).toEqual(['0:1', '0:3', '1:2', '2:3'])
    })
  })
})
