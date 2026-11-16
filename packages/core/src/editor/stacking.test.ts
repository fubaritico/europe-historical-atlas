import { describe, expect, it } from 'vitest'

import { paintOrder } from '../data/paintOrder'
import { createYearDocument } from '../data/yearDocument'

import { FIXTURE_SOURCES } from './documentFixtures'
import { areSiblings, availableMoves, restack, restackBeside } from './stacking'

import type { YearDocument } from '../data/yearDocument'
import type { YearPolity } from '../data/yearFormat'

/**
 * A polity with only what the stack reads: its id and its suzerain.
 * @param id - its id
 * @param suzerain - whom it owes, or `null`
 * @returns the polity
 */
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

/**
 * A year holding these polities, in this list order.
 * @param polities - the polities
 * @returns the document
 */
function yearOf(...polities: YearPolity[]): YearDocument {
  const doc = createYearDocument(1100, FIXTURE_SOURCES)
  doc.polities = polities
  return doc
}

/** France with two vassals, then the Empire — `s16`'s groups. */
function groups(): YearDocument {
  return yearOf(polity('fr'), polity('normandy', 'fr'), polity('aquitaine', 'fr'), polity('hre'))
}

const painted = (doc: YearDocument): string[] => paintOrder(doc.polities).order

const three = () => yearOf(polity('fr'), polity('a', 'fr'), polity('b', 'fr'), polity('c', 'fr'))

describe('stacking', () => {
  describe('happy path', () => {
    // s16 — "bring a group to the front, vassals with it".
    it('brings France to the front with its vassals, over the Empire', () => {
      const doc = groups()
      expect(restack(doc, 'fr', 'front')).toBe(true)
      expect(painted(doc)).toEqual(['hre', 'fr', 'normandy', 'aquitaine'])
    })
  })

  describe('variants', () => {
    // s16 — "re-order two vassals of one suzerain".
    it('brings Normandy forward over Aquitaine, both still over France', () => {
      const doc = groups()
      restack(doc, 'normandy', 'forward')
      expect(painted(doc)).toEqual(['fr', 'aquitaine', 'normandy', 'hre'])
    })

    it('sends the Empire to the back, under France and its vassals', () => {
      const doc = groups()
      restack(doc, 'hre', 'back')
      expect(painted(doc)).toEqual(['hre', 'fr', 'normandy', 'aquitaine'])
    })

    // Three siblings, moved from an end, so one place and all the way differ (review QUAL-001).
    it('moves the back vassal of three one place forward, and the front one one place back', () => {
      const forward = three()
      restack(forward, 'a', 'forward')
      expect(painted(forward)).toEqual(['fr', 'b', 'a', 'c'])
      const backward = three()
      restack(backward, 'c', 'backward')
      expect(painted(backward)).toEqual(['fr', 'a', 'c', 'b'])
      expect(Object.values(availableMoves(three(), 'b'))).toEqual([true, true, true, true])
    })

    it('moves one place at a time, and back again', () => {
      const doc = groups()
      restack(doc, 'normandy', 'forward')
      restack(doc, 'normandy', 'backward')
      expect(painted(doc)).toEqual(['fr', 'normandy', 'aquitaine', 'hre'])
    })

    it('enables the moves that change something, among siblings', () => {
      expect(availableMoves(groups(), 'aquitaine')).toEqual({
        front: false,
        forward: false,
        backward: true,
        back: true,
      })
      expect(availableMoves(groups(), 'fr')).toEqual({
        front: true,
        forward: true,
        backward: false,
        back: false,
      })
    })
  })

  describe('managed errors', () => {
    // s16 — "a vassal cannot be sent under its suzerain".
    it('refuses to send the lowest vassal further back, and France stays under it', () => {
      const doc = groups()
      expect(restack(doc, 'normandy', 'back')).toBe(false)
      expect(restack(doc, 'normandy', 'backward')).toBe(false)
      expect(painted(doc)).toEqual(['fr', 'normandy', 'aquitaine', 'hre'])
    })

    // s16 — "a command that would change nothing is disabled".
    it('refuses front on the front group, the order unchanged', () => {
      const doc = groups()
      expect(restack(doc, 'hre', 'front')).toBe(false)
      expect(doc.polities.map((held) => held.id)).toEqual(['fr', 'normandy', 'aquitaine', 'hre'])
    })

    it('refuses a polity the list does not hold, and disables every move', () => {
      const doc = groups()
      expect(restack(doc, 'leon', 'front')).toBe(false)
      expect(Object.values(availableMoves(doc, 'leon'))).toEqual([false, false, false, false])
    })
  })

  describe('unmanaged errors', () => {
    // Only the siblings' slots change: every other polity keeps its place in the list.
    it('leaves the other polities where they are in the list', () => {
      const doc = yearOf(
        polity('fr'),
        polity('normandy', 'fr'),
        polity('hre'),
        polity('aquitaine', 'fr')
      )
      restack(doc, 'aquitaine', 'back')
      expect(doc.polities.map((held) => held.id)).toEqual(['fr', 'aquitaine', 'hre', 'normandy'])
    })

    // A suzerain the list lacks counts as none, as paintOrder reads it.
    it('moves a polity whose suzerain is missing among the top-level groups', () => {
      const doc = yearOf(polity('fr'), polity('normandy', 'gone'))
      restack(doc, 'normandy', 'back')
      expect(painted(doc)).toEqual(['normandy', 'fr'])
    })
  })

  describe('edge cases', () => {
    it('disables every move for an only child', () => {
      const doc = yearOf(polity('fr'), polity('normandy', 'fr'))
      expect(Object.values(availableMoves(doc, 'normandy'))).toEqual([false, false, false, false])
      expect(restack(doc, 'normandy', 'front')).toBe(false)
    })

    it('refuses every move on an empty year', () => {
      expect(restack(yearOf(), 'fr', 'back')).toBe(false)
    })
  })
})

/**
 * The ids in list order, back to front.
 * @param doc - the document
 * @returns its polities' ids
 */
const order = (doc: YearDocument) => doc.polities.map((each) => each.id)

// CARTO-457, the dev, 2026-11-16: a row dragged in {Polities} lands beside a sibling — « c'est un déplacement entre siblings »
describe('restackBeside', () => {
  describe('happy path', () => {
    it('puts the back vassal in front of the front one, in one move', () => {
      const doc = yearOf(polity('fr'), polity('a', 'fr'), polity('b', 'fr'), polity('c', 'fr'))
      expect(restackBeside(doc, 'a', 'c', 'front')).toBe(true)
      expect(order(doc)).toEqual(['fr', 'b', 'c', 'a'])
    })
  })

  describe('variants', () => {
    it('puts a polity behind a sibling', () => {
      const doc = yearOf(polity('fr'), polity('a', 'fr'), polity('b', 'fr'), polity('c', 'fr'))
      expect(restackBeside(doc, 'c', 'a', 'back')).toBe(true)
      expect(order(doc)).toEqual(['fr', 'c', 'a', 'b'])
    })

    it('moves a top-level group with its vassals, the others in their slots', () => {
      const doc = yearOf(polity('fr'), polity('norm', 'fr'), polity('hre'))
      expect(restackBeside(doc, 'hre', 'fr', 'back')).toBe(true)
      expect(paintOrder(doc.polities).order).toEqual(['hre', 'fr', 'norm'])
    })
  })

  describe('managed errors', () => {
    it('refuses a polity dropped among another suzerain’s vassals, nothing moved', () => {
      const doc = yearOf(polity('fr'), polity('a', 'fr'), polity('hre'), polity('b', 'hre'))
      expect(areSiblings(doc, 'a', 'b')).toBe(false)
      expect(restackBeside(doc, 'a', 'b', 'front')).toBe(false)
      expect(order(doc)).toEqual(['fr', 'a', 'hre', 'b'])
    })

    it('refuses a vassal dropped on its own suzerain — never siblings', () => {
      const doc = yearOf(polity('fr'), polity('a', 'fr'))
      expect(restackBeside(doc, 'a', 'fr', 'front')).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an id the list does not hold', () => {
      const doc = yearOf(polity('fr'), polity('hre'))
      expect(restackBeside(doc, 'nobody', 'fr', 'front')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('changes nothing for a polity dropped on itself, or where it already stands', () => {
      const doc = yearOf(polity('a'), polity('b'))
      expect(restackBeside(doc, 'a', 'a', 'front')).toBe(false)
      expect(restackBeside(doc, 'a', 'b', 'back')).toBe(false)
      expect(order(doc)).toEqual(['a', 'b'])
    })
  })
})
