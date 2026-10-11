import { describe, expect, it } from 'vitest'

import {
  addAnchor,
  addOutline,
  addPolity,
  closeRing,
  declareSource,
  duplicateRun,
  moveAnchor,
  pathsHolding,
  removePolity,
  updatePolity,
  wouldLoopHomage,
} from './documentEdits'
import { FIXTURE_SOURCES, FIXTURE_ZONE, sharedBorderDocument } from './documentFixtures'
import { createYearDocument } from './yearDocument'

import type { YearPolity } from '../data/yearFormat'

const zone = FIXTURE_ZONE
const source = FIXTURE_SOURCES

/** An identity with nothing filled in beyond what it needs. */
function polity(id: string, name: string, suzerain: string | null = null): YearPolity {
  return {
    id,
    name,
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
 * France and the Empire, side by side, **sharing anchors 1 and 2 along the Meuse**.
 *
 * `0 1 2 3` is France's square, `1 4 5 2` is the Empire's. The two indices in the middle are one limit
 * held by two paths, which is the whole point of the model and the thing a deletion must not disturb.
 *
 * The shape itself lives in `documentFixtures` — three suites need it, and a fixture copied between them
 * can drift from what it is meant to verify with nothing failing to say so.
 */
const neighbours = sharedBorderDocument

describe('anchors', () => {
  describe('happy path', () => {
    it('returns the new anchor’s index, which is its id', () => {
      const doc = createYearDocument(1100, zone, source)
      expect(addAnchor(doc, [1, 2], 0)).toBe(0)
      expect(addAnchor(doc, [3, 4], 0)).toBe(1)
      expect(doc.anchors[1]).toEqual([3, 4])
    })

    it('moves a point in place', () => {
      const doc = neighbours()
      expect(moveAnchor(doc, 1, [9, 9])).toBe(true)
      expect(doc.anchors[1]).toEqual([9, 9])
    })
  })

  describe('variants', () => {
    it('counts how many paths hold an anchor, which is what a deletion needs to know', () => {
      const doc = neighbours()
      expect(pathsHolding(doc, 1)).toBe(2) // the shared limit
      expect(pathsHolding(doc, 0)).toBe(1) // France's alone
      expect(pathsHolding(doc, 4)).toBe(1) // the Empire's alone
    })

    it('counts a declared gap and a dressed run as holders too', () => {
      const doc = neighbours()
      doc.deliberateGaps.push({ ring: [0, 1, 2], reason: 'marches' })
      doc.runs.push({ run: [1, 2], hand: 'bold', source: null, note: null })
      expect(pathsHolding(doc, 1)).toBe(4)
    })

    it('records which source an anchor came from', () => {
      const doc = createYearDocument(1100, zone, [
        ...source,
        { id: 1, name: 'Natural Earth 10m coastline', licence: 'public domain' },
      ])
      addAnchor(doc, [1, 2], 1)
      expect(doc.anchorSource).toEqual([1])
    })
  })

  describe('managed errors', () => {
    it('refuses to move an anchor that is not there', () => {
      const doc = neighbours()
      expect(moveAnchor(doc, 99, [1, 1])).toBe(false)
      expect(moveAnchor(doc, -1, [1, 1])).toBe(false)
      expect(doc.anchors).toHaveLength(6)
    })
  })

  describe('unmanaged errors', () => {
    // L4: no async, no collaborator — the arguments are numbers and arrays.

    it('counts zero paths for an index nothing could hold', () => {
      expect(pathsHolding(neighbours(), 500)).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('never shifts an existing index when a point is added', () => {
      const doc = neighbours()
      const before = [...(doc.claims[0]?.rings[0] ?? [])]
      addAnchor(doc, [7, 7], 0)
      expect(doc.claims[0]?.rings[0]).toEqual(before)
    })
  })
})

describe('polities and rings', () => {
  describe('happy path', () => {
    it('adds an identity with no territory, which is the normal starting state', () => {
      const doc = createYearDocument(1100, zone, source)
      expect(addPolity(doc, polity('fr-couronne', 'Reaume de France'))).toBe(true)
      expect(doc.claims).toEqual([])
    })

    it('closes a ring onto a polity that had none', () => {
      const doc = createYearDocument(1100, zone, source)
      addPolity(doc, polity('x', 'X'))
      for (const point of [
        [0, 0],
        [1, 0],
        [1, 1],
      ] as [number, number][])
        addAnchor(doc, point, 0)
      expect(closeRing(doc, 'x', [0, 1, 2])).toBe(true)
      expect(doc.claims[0]?.rings).toEqual([[0, 1, 2]])
    })
  })

  describe('variants', () => {
    it('adds a second ring to a polity that already holds one', () => {
      const doc = neighbours()
      expect(closeRing(doc, 'fr-couronne', [1, 2, 3])).toBe(true)
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings).toHaveLength(2)
    })
  })

  describe('managed errors', () => {
    it('refuses a duplicate id rather than merging two polities', () => {
      const doc = neighbours()
      expect(addPolity(doc, polity('fr-couronne', 'something else'))).toBe(false)
      expect(doc.polities).toHaveLength(2)
    })

    it('refuses a ring of fewer than three anchors', () => {
      const doc = neighbours()
      expect(closeRing(doc, 'fr-couronne', [0, 1])).toBe(false)
    })

    it('refuses a ring for a polity that does not exist', () => {
      const doc = neighbours()
      expect(closeRing(doc, 'burgundy', [0, 1, 2])).toBe(false)
      expect(doc.claims).toHaveLength(2)
    })

    it('refuses a ring pointing past the anchor table', () => {
      const doc = neighbours()
      expect(closeRing(doc, 'fr-couronne', [0, 1, 99])).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a negative index', () => {
      expect(closeRing(neighbours(), 'fr-couronne', [0, 1, -3])).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('accepts a ring of exactly three', () => {
      expect(closeRing(neighbours(), 'fr-couronne', [0, 1, 2])).toBe(true)
    })
  })
})

describe('duplicateRun', () => {
  describe('happy path', () => {
    it('copies the LIST and not the points, so the two outlines are one geometry', () => {
      // The dev's mechanism: "on duplique un tracé et on aura des tracés concomitants, c'est tout."
      const doc = neighbours()
      const anchorsBefore = doc.anchors.length
      expect(duplicateRun(doc, [0, 1, 2], 'hre')).toBe(true)
      expect(doc.anchors).toHaveLength(anchorsBefore)
      const empire = doc.claims.find((claim) => claim.polity === 'hre')
      expect(empire?.rings[1]).toEqual([2, 1, 0])
    })

    it('moving a duplicated anchor afterwards moves both owners', () => {
      const doc = neighbours()
      duplicateRun(doc, [0, 1, 2], 'hre')
      moveAnchor(doc, 1, [42, 42])
      expect(doc.anchors[1]).toEqual([42, 42])
      // Both rings hold index 1, so there is nothing that could have failed to follow.
      expect(doc.claims[0]?.rings[0]).toContain(1)
      expect(doc.claims[1]?.rings[1]).toContain(1)
    })
  })

  describe('variants', () => {
    it('reverses the run, because two owners walk their boundary in opposite directions', () => {
      const doc = neighbours()
      duplicateRun(doc, [0, 1, 2, 3], 'hre')
      expect(doc.claims.find((claim) => claim.polity === 'hre')?.rings[1]).toEqual([3, 2, 1, 0])
    })

    it('raises the reference count rather than adding geometry', () => {
      const doc = neighbours()
      const before = pathsHolding(doc, 0)
      duplicateRun(doc, [0, 1, 2], 'hre')
      expect(pathsHolding(doc, 0)).toBe(before + 1)
    })
  })

  describe('managed errors', () => {
    it('refuses a run of fewer than three anchors', () => {
      expect(duplicateRun(neighbours(), [0, 1], 'hre')).toBe(false)
    })

    it('refuses an unknown target polity', () => {
      expect(duplicateRun(neighbours(), [0, 1, 2], 'burgundy')).toBe(false)
    })

    it('refuses a run pointing past the anchor table', () => {
      expect(duplicateRun(neighbours(), [0, 1, 99], 'hre')).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('leaves the document untouched when it refuses', () => {
      const doc = neighbours()
      const before = JSON.stringify(doc)
      duplicateRun(doc, [0, 1, 99], 'hre')
      expect(JSON.stringify(doc)).toBe(before)
    })
  })

  describe('edge cases', () => {
    it('lets a polity duplicate its own run, which is how an exclave over the same points starts', () => {
      const doc = neighbours()
      expect(duplicateRun(doc, [0, 1, 2], 'fr-couronne')).toBe(true)
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings).toHaveLength(2)
    })
  })
})

describe('removePolity', () => {
  describe('happy path', () => {
    it('removes the identity, the claim and the borders naming it', () => {
      const doc = neighbours()
      doc.pairs.push({
        between: ['fr-couronne', 'hre'],
        type: 'agreed',
        hand: null,
        source: null,
        note: null,
      })
      const report = removePolity(doc, 'hre')
      expect(report?.rings).toBe(1)
      expect(report?.bordersDropped).toBe(1)
      expect(doc.polities.map((p) => p.id)).toEqual(['fr-couronne'])
      expect(doc.claims.map((c) => c.polity)).toEqual(['fr-couronne'])
    })
  })

  describe('variants', () => {
    it('DOES NOT TOUCH the anchors its neighbour shares — the blocking vulnerability', () => {
      // The sharpest failure in the whole editor, and the least suspicious gesture. Deleting the
      // Empire's *points* would move France's eastern limit, on screen, with no error anywhere.
      const doc = neighbours()
      const franceRing = [...(doc.claims.find((c) => c.polity === 'fr-couronne')?.rings[0] ?? [])]
      const coordinates = franceRing.map((index) => doc.anchors[index])

      removePolity(doc, 'hre')

      expect(doc.claims.find((c) => c.polity === 'fr-couronne')?.rings[0]).toEqual(franceRing)
      expect(franceRing.map((index) => doc.anchors[index])).toEqual(coordinates)
      expect(doc.anchors).toHaveLength(6)
    })

    it('reports what was kept because it is shared, and what is now orphaned', () => {
      // The Empire held 1, 4, 5, 2. Anchors 1 and 2 are France's too; 4 and 5 were the Empire's alone.
      const report = removePolity(neighbours(), 'hre')
      expect(report?.anchorsKept).toBe(2)
      expect(report?.anchorsOrphaned).toBe(2)
    })

    it('leaves a vassal sovereign rather than pointing at nothing', () => {
      const doc = neighbours()
      addPolity(doc, polity('aquitaine', 'Aquitaine', 'fr-couronne'))
      removePolity(doc, 'fr-couronne')
      expect(doc.polities.find((p) => p.id === 'aquitaine')?.suzerain).toBeNull()
    })

    it('leaves a dressed run alone even when every anchor under it is orphaned', () => {
      // A hand-set stroke is a decision; dropping it here would undo it with nothing said. It shows
      // in {Overrides} as orphaned and is cleared by hand.
      const doc = neighbours()
      doc.runs.push({ run: [4, 5], hand: 'bold', source: null, note: null })
      removePolity(doc, 'hre')
      expect(doc.runs).toHaveLength(1)
    })

    it('reports zero orphans when every anchor was shared', () => {
      const doc = neighbours()
      duplicateRun(doc, [1, 4, 5, 2], 'fr-couronne')
      const report = removePolity(doc, 'hre')
      expect(report?.anchorsOrphaned).toBe(0)
      expect(report?.anchorsKept).toBe(4)
    })
  })

  describe('managed errors', () => {
    it('answers null for a polity that was not there, and changes nothing', () => {
      const doc = neighbours()
      const before = JSON.stringify(doc)
      expect(removePolity(doc, 'burgundy')).toBeNull()
      expect(JSON.stringify(doc)).toBe(before)
    })
  })

  describe('unmanaged errors', () => {
    it('removes a polity that holds no territory at all', () => {
      const doc = neighbours()
      addPolity(doc, polity('ghost', 'Ghost'))
      const report = removePolity(doc, 'ghost')
      expect(report).toEqual({
        rings: 0,
        anchorsKept: 0,
        anchorsOrphaned: 0,
        bordersDropped: 0,
      })
    })
  })

  describe('edge cases', () => {
    it('removing both neighbours leaves an empty year rather than a broken one', () => {
      const doc = neighbours()
      removePolity(doc, 'hre')
      removePolity(doc, 'fr-couronne')
      expect(doc.polities).toEqual([])
      expect(doc.claims).toEqual([])
      expect(doc.anchors).toHaveLength(6) // still open, still untouched
    })

    it('a polity holding several rings reports all of them', () => {
      const doc = neighbours()
      closeRing(doc, 'hre', [1, 2, 4])
      expect(removePolity(doc, 'hre')?.rings).toBe(2)
    })
  })
})

const BY_EYE = { name: 'reported by eye', licence: 'fact' }

/** Three points of a small triangle, west of the fixture's squares. */
const TRIANGLE_AT: [number, number][] = [
  [-4, 47],
  [-2, 48],
  [-2, 46],
]

/** The same triangle, each point reported by eye. */
const TRIANGLE = TRIANGLE_AT.map((at) => ({ at, provenance: BY_EYE }))

describe('addOutline', () => {
  describe('happy path', () => {
    // s02 — the Pen's outline closes: its anchors and its ring enter the document together.
    it('adds the anchors and closes them into a ring for the polity', () => {
      const doc = createYearDocument(1100, zone)
      addPolity(doc, polity('fr', 'France'))
      expect(addOutline(doc, 'fr', TRIANGLE)).toBe(true)
      expect(doc.anchors).toEqual(TRIANGLE_AT)
      expect(doc.claims).toEqual([{ polity: 'fr', rings: [[0, 1, 2]] }])
    })

    it('records every new anchor under the provenance given', () => {
      const doc = createYearDocument(1100, zone)
      addPolity(doc, polity('fr', 'France'))
      addOutline(doc, 'fr', TRIANGLE)
      expect(doc.sources).toEqual([{ id: 0, ...BY_EYE }])
      expect(doc.anchorSource).toEqual([0, 0, 0])
    })
  })

  describe('variants', () => {
    it('reuses a provenance already declared rather than declaring it twice', () => {
      const doc = createYearDocument(1100, zone, [{ id: 0, ...BY_EYE }])
      addPolity(doc, polity('fr', 'France'))
      addOutline(doc, 'fr', TRIANGLE)
      addOutline(doc, 'fr', TRIANGLE)
      expect(doc.sources).toHaveLength(1)
      expect(doc.claims[0]?.rings).toHaveLength(2)
    })

    it('appends after the anchors already there, so no existing index moves', () => {
      const doc = sharedBorderDocument()
      const before = doc.anchors.length
      addOutline(doc, 'fr-couronne', TRIANGLE)
      expect(doc.claims.find((claim) => claim.polity === 'fr-couronne')?.rings[1]).toEqual([
        before,
        before + 1,
        before + 2,
      ])
    })
  })

  describe('managed errors', () => {
    // Checked before writing: a refused outline leaves nothing behind for the save to clean up.
    it('refuses an unknown polity and writes nothing', () => {
      const doc = createYearDocument(1100, zone)
      expect(addOutline(doc, 'nobody', TRIANGLE)).toBe(false)
      expect(doc.anchors).toEqual([])
      expect(doc.sources).toEqual([])
    })

    it('refuses two points, which enclose nothing, and writes nothing', () => {
      const doc = createYearDocument(1100, zone)
      addPolity(doc, polity('fr', 'France'))
      expect(addOutline(doc, 'fr', TRIANGLE.slice(0, 2))).toBe(false)
      expect(doc.anchors).toEqual([])
      expect(doc.claims).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // The caller's array is copied point by point: mutating it afterwards cannot reach the document.
    it('keeps its own copy of each point', () => {
      const doc = createYearDocument(1100, zone)
      addPolity(doc, polity('fr', 'France'))
      const points = TRIANGLE_AT.map((at): [number, number] => [at[0], at[1]])
      addOutline(
        doc,
        'fr',
        points.map((at) => ({ at, provenance: BY_EYE }))
      )
      if (points[0]) points[0][0] = 99
      expect(doc.anchors[0]).toEqual([-4, 47])
    })
  })

  describe('edge cases', () => {
    // H-06: a point on a neighbour's anchor reuses it — the two rings then share one border.
    it('reuses an existing anchor by its index, without copying it', () => {
      const doc = sharedBorderDocument()
      const before = doc.anchors.length
      addPolity(doc, polity('lu', 'Lotharingia'))
      addOutline(doc, 'lu', [
        { at: [4, 48], provenance: BY_EYE, anchor: 4 },
        { at: [4, 46], provenance: BY_EYE, anchor: 5 },
        { at: [6, 47], provenance: BY_EYE },
      ])
      expect(doc.anchors).toHaveLength(before + 1)
      expect(doc.claims.find((claim) => claim.polity === 'lu')?.rings[0]).toEqual([4, 5, before])
    })

    it('refuses an outline naming an anchor the document does not hold, and writes nothing', () => {
      const doc = sharedBorderDocument()
      const before = doc.anchors.length
      addPolity(doc, polity('lu', 'Lotharingia'))
      expect(
        addOutline(doc, 'lu', [
          { at: [4, 48], provenance: BY_EYE, anchor: 99 },
          { at: [4, 46], provenance: BY_EYE },
          { at: [6, 47], provenance: BY_EYE },
        ])
      ).toBe(false)
      expect(doc.anchors).toHaveLength(before)
    })

    // One ring may mix points placed by eye and points snapped onto the coast.
    it('records each point under its own provenance', () => {
      const doc = createYearDocument(1100, zone)
      addPolity(doc, polity('fr', 'France'))
      const coast = { name: 'Natural Earth 10m land minus lakes', licence: 'public domain' }
      addOutline(doc, 'fr', [
        { at: [-4, 47], provenance: BY_EYE },
        { at: [-2, 48], provenance: coast },
        { at: [-2, 46], provenance: coast },
      ])
      expect(doc.sources).toEqual([
        { id: 0, ...BY_EYE },
        { id: 1, ...coast },
      ])
      expect(doc.anchorSource).toEqual([0, 1, 1])
    })

    it('declares a new id past the highest one, even when the ids are not dense', () => {
      const doc = createYearDocument(1100, zone, [{ id: 4, name: 'Duby', licence: 'fact' }])
      expect(declareSource(doc, BY_EYE)).toBe(5)
    })

    it('tells the same words under another licence apart', () => {
      const doc = createYearDocument(1100, zone, [{ id: 0, ...BY_EYE }])
      expect(declareSource(doc, { name: BY_EYE.name, licence: 'CC0' })).toBe(1)
    })
  })
})

describe('updatePolity', () => {
  /**
   * The shared-border document with a third polity, a vassal of France.
   * @returns the document
   */
  function withVassal() {
    const doc = sharedBorderDocument()
    const [france] = doc.polities
    if (france === undefined) throw new Error('fixture changed')
    doc.polities.push({ ...france, id: 'normandy', name: 'Normandie', suzerain: 'fr-couronne' })
    return doc
  }

  /**
   * The document's first polity — France.
   * @param doc - the document
   * @returns it
   */
  function first(doc: ReturnType<typeof withVassal>): YearPolity {
    const polity = doc.polities[0]
    if (polity === undefined) throw new Error('fixture changed')
    return polity
  }

  describe('happy path', () => {
    // s07 — "the same form as creation opens … I can change name, rank, status, dates, suzerain, colour".
    it('changes a polity’s properties under the same id, in the same place in the list', () => {
      const doc = withVassal()
      const [france] = doc.polities
      if (france === undefined) throw new Error('fixture changed')
      expect(updatePolity(doc, { ...france, name: 'Royaume de France', colour: '#3355aa' })).toBe(
        true
      )
      expect(doc.polities[0]).toMatchObject({
        id: 'fr-couronne',
        name: 'Royaume de France',
        colour: '#3355aa',
      })
    })
  })

  describe('variants', () => {
    it('moves a polity under another suzerain', () => {
      const doc = withVassal()
      const normandy = doc.polities[2]
      if (normandy === undefined) throw new Error('fixture changed')
      expect(updatePolity(doc, { ...normandy, suzerain: 'hre' })).toBe(true)
      expect(doc.polities[2]?.suzerain).toBe('hre')
    })

    it('keeps its own copy, so the caller’s object cannot change it later', () => {
      const doc = withVassal()
      const france = { ...first(doc) }
      updatePolity(doc, france)
      france.name = 'changed after'
      expect(doc.polities[0]?.name).not.toBe('changed after')
    })
  })

  describe('managed errors', () => {
    it('refuses a polity no one in the year has, and changes nothing', () => {
      const doc = withVassal()
      const before = structuredClone(doc.polities)
      expect(updatePolity(doc, { ...first(doc), id: 'nobody' })).toBe(false)
      expect(doc.polities).toEqual(before)
    })

    // A loop of homage is refused by the document, not only by the form's list.
    it('refuses France as a vassal of its own vassal, and of itself', () => {
      const doc = withVassal()
      const france = first(doc)
      expect(updatePolity(doc, { ...france, suzerain: 'normandy' })).toBe(false)
      expect(updatePolity(doc, { ...france, suzerain: 'fr-couronne' })).toBe(false)
      expect(doc.polities[0]?.suzerain).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('accepts a suzerain the year does not hold — the readers refuse it on load', () => {
      const doc = withVassal()
      expect(wouldLoopHomage(doc, 'normandy', 'gone')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('sees a loop already in the document without walking for ever', () => {
      const doc = withVassal()
      first(doc).suzerain = 'normandy'
      expect(wouldLoopHomage(doc, 'hre', 'normandy')).toBe(false)
      expect(wouldLoopHomage(doc, 'normandy', 'fr-couronne')).toBe(true)
    })
  })
})
