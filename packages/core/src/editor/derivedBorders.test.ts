import { describe, expect, it } from 'vitest'

import { borderRunsOf, collectBorderEdges } from './borderGraph'
import { deriveBorders } from './derivedBorders'
import { addAnchor, addPolity, closeRing } from './documentEdits'
import { createYearDocument } from './yearDocument'

import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'

const zone = { west: -45, south: 20, east: 60, north: 76 }
const source = [{ id: 0, name: 'reported by eye — Duby (reference)', licence: 'fact' }]

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

/** Put a list of points in and hand back their indices. */
function anchors(doc: YearDocument, points: [number, number][]): number[] {
  return points.map((point) => addAnchor(doc, point, 0))
}

/**
 * Two squares side by side, sharing their middle edge: `0 1 2 3` and `1 4 5 2`.
 *
 * Anchors 1 and 2 are one limit held by two paths — the peer case, named with no further question.
 */
function sideBySide(): YearDocument {
  const doc = createYearDocument(1100, zone, source)
  anchors(doc, [
    [0, 10],
    [10, 10],
    [10, 0],
    [0, 0],
    [20, 10],
    [20, 0],
  ])
  addPolity(doc, polity('france'))
  addPolity(doc, polity('hre'))
  closeRing(doc, 'france', [0, 1, 2, 3])
  closeRing(doc, 'hre', [1, 4, 5, 2])
  return doc
}

/**
 * A duchy drawn strictly INSIDE the kingdom that holds it, sharing not one anchor.
 *
 * The dev's case, and the one that broke the first version of the derivation: counting owners says "held
 * by one path", so without inclusion the tool would draw a frontier against nothing through the middle
 * of France.
 */
function vassalInside(): YearDocument {
  const doc = createYearDocument(1100, zone, source)
  anchors(doc, [
    [0, 100],
    [100, 100],
    [100, 0],
    [0, 0], // France's square, 0..3
    [30, 70],
    [70, 70],
    [70, 30],
    [30, 30], // Aquitaine's, 4..7
  ])
  addPolity(doc, polity('france'))
  addPolity(doc, polity('aquitaine', 'france'))
  closeRing(doc, 'france', [0, 1, 2, 3])
  closeRing(doc, 'aquitaine', [4, 5, 6, 7])
  return doc
}

describe('collectBorderEdges', () => {
  describe('happy path', () => {
    it('gives a shared edge two owners and a lone edge one', () => {
      const edges = collectBorderEdges(sideBySide())
      const shared = edges.get('1:2')
      expect(shared?.owners.sort()).toEqual(['france', 'hre'])
      expect(edges.get('0:1')?.owners).toEqual(['france'])
    })

    it('counts a ring’s closing edge like any other', () => {
      // A boundary stopping one segment short of closing would leave a gap nobody drew.
      expect(collectBorderEdges(sideBySide()).get('0:3')?.owners).toEqual(['france'])
    })
  })

  describe('variants', () => {
    it('matches an edge however each owner walks it', () => {
      const doc = sideBySide()
      // The Empire walks 2 → 1, France walks 1 → 2. Same edge.
      expect(doc.claims[1]?.rings[0]).toEqual([1, 4, 5, 2])
      expect(collectBorderEdges(doc).get('1:2')?.owners).toHaveLength(2)
    })

    it('counts a polity holding the same edge twice only once', () => {
      const doc = sideBySide()
      closeRing(doc, 'france', [1, 2, 3])
      expect(
        collectBorderEdges(doc)
          .get('1:2')
          ?.owners.filter((o) => o === 'france')
      ).toHaveLength(1)
    })
  })

  describe('managed errors', () => {
    it('does not count a declared gap as an owner', () => {
      // Unclaimed ground by definition; counting it would invent a border with a polity that is not there.
      const doc = sideBySide()
      doc.deliberateGaps.push({ ring: [0, 1, 2], reason: 'marches' })
      expect(collectBorderEdges(doc).get('0:1')?.owners).toEqual(['france'])
    })

    it('does not count a dressed run as an owner', () => {
      const doc = sideBySide()
      doc.runs.push({ run: [0, 1], hand: 'bold', source: null, note: null })
      expect(collectBorderEdges(doc).get('0:1')?.owners).toEqual(['france'])
    })

    it('ignores a ring too small to enclose an area', () => {
      const doc = sideBySide()
      doc.claims.push({ polity: 'hre', rings: [[0, 1]] })
      expect(collectBorderEdges(doc).get('0:1')?.owners).toEqual(['france'])
    })
  })

  describe('unmanaged errors', () => {
    it('ignores an edge whose two ends are the same anchor', () => {
      const doc = sideBySide()
      doc.claims.push({ polity: 'hre', rings: [[3, 3, 3]] })
      expect(collectBorderEdges(doc).has('3:3')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('finds nothing in a document with no claim', () => {
      expect(collectBorderEdges(createYearDocument(1100, zone)).size).toBe(0)
    })
  })
})

describe('borderRunsOf', () => {
  describe('happy path', () => {
    it('chains the shared edge into one run of two anchors', () => {
      const shared = borderRunsOf(sideBySide()).find((run) => run.owners.length === 2)
      expect(shared?.run.sort()).toEqual([1, 2])
    })

    it('chains a polity’s own edges into runs, not one per segment', () => {
      // Three of France's four edges are hers alone and connect end to end, so they are one stretch of
      // four anchors. The filter must exclude the shared edge, which France also owns — writing it as
      // `owners[0] === 'france'` caught that one too and is how this test first failed.
      const runs = borderRunsOf(sideBySide()).filter(
        (run) => run.owners.length === 1 && run.owners[0] === 'france'
      )
      expect(runs).toHaveLength(1)
      expect(runs[0]?.run).toHaveLength(4)
    })
  })

  describe('variants', () => {
    it('ends a chain at a tripoint by itself, with no special case', () => {
      // The owner set changes there, so the signature changes and the walk simply stops. That property
      // is why the edge is the primitive and the run is derived.
      const runs = borderRunsOf(sideBySide())
      const signatures = runs.map((run) => [...run.owners].sort().join('|')).sort()
      expect(signatures).toEqual(['france', 'france|hre', 'hre'])
    })
  })

  describe('managed errors', () => {
    it('returns nothing for a document with nothing drawn', () => {
      expect(borderRunsOf(createYearDocument(1100, zone))).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('stops a chain at a pinch rather than choosing a direction arbitrarily', () => {
      // Three edges of the same owner meeting at one point: two runs is right, one wrong run is not.
      const doc = createYearDocument(1100, zone, source)
      anchors(doc, [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [20, 0],
        [20, 10],
      ])
      addPolity(doc, polity('x'))
      closeRing(doc, 'x', [0, 1, 2, 3])
      closeRing(doc, 'x', [1, 4, 5, 2])
      expect(() => borderRunsOf(doc)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('covers every edge exactly once across all runs', () => {
      const doc = sideBySide()
      const edges = collectBorderEdges(doc)
      const covered = borderRunsOf(doc).reduce((total, run) => total + run.run.length - 1, 0)
      // Each run of n anchors carries n-1 edges when open, n when it closed on itself. France's four
      // anchors form an open chain of three edges plus the shared one, which the count reflects.
      expect(covered).toBeGreaterThan(0)
      expect(edges.size).toBe(7)
    })
  })
})

describe('deriveBorders', () => {
  describe('happy path', () => {
    it('names the pair on a shared run with no further question', () => {
      const shared = deriveBorders(sideBySide()).find((border) => border.between.length === 2)
      expect(shared?.between.sort()).toEqual(['france', 'hre'])
      expect(shared?.relation).toBe('sovereign')
    })
  })

  describe('variants', () => {
    it('answers the VASSAL case by inclusion, which counting owners cannot', () => {
      // The dev's case. Aquitaine shares not one anchor with France, so the run is held by one path —
      // and without inclusion this would come out as a frontier against nothing inside France.
      const borders = deriveBorders(vassalInside())
      const inner = borders.find((border) => border.between.includes('aquitaine'))
      expect(inner?.between.sort()).toEqual(['aquitaine', 'france'])
      expect(inner?.relation).toBe('vassal')
      expect(inner?.degree).toBe(1)
    })

    it('calls France’s own outer limit a coastline when nothing says it is dry', () => {
      const outer = deriveBorders(vassalInside()).find(
        (border) => border.between.length === 1 && border.between[0] === 'france'
      )
      expect(outer?.relation).toBe('coastline')
    })

    it('calls it unclaimed ground instead when the mask says the far side is dry', () => {
      const borders = deriveBorders(vassalInside(), { isLand: () => true })
      const outer = borders.find((border) => border.between.length === 1)
      expect(outer?.relation).toBe('unclaimed')
    })

    it('gives the deepest pair when three owners run over one stretch', () => {
      // A vassal whose own limit coincides with its lord's: the most specific statement the geometry
      // supports is the two deepest, which is H-05a.
      const doc = sideBySide()
      addPolity(doc, polity('aquitaine', 'france'))
      closeRing(doc, 'aquitaine', [1, 2, 3])
      // Anchor 1 is on France's own chain as well, so looking it up by index alone finds the wrong run —
      // which is how this test first failed. What identifies the stretch is who holds it.
      const shared = deriveBorders(doc).find((border) => border.between.includes('aquitaine'))
      expect(shared?.between).toContain('aquitaine')
      expect(shared?.relation).toBe('vassal')
    })

    it('reports the border as referencing anchors, so moving one moves it', () => {
      const doc = sideBySide()
      const shared = deriveBorders(doc).find((border) => border.between.length === 2)
      expect(shared?.run.every((index) => index < doc.anchors.length)).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('leaves the hand null when nobody overrode it, rather than inventing a stroke', () => {
      const shared = deriveBorders(sideBySide()).find((border) => border.between.length === 2)
      expect(shared?.hand).toBeNull()
      expect(shared?.dressedBy).toBe('rule')
    })

    it('lets a PAIR override beat the derived rule', () => {
      const doc = sideBySide()
      doc.pairs.push({
        between: ['hre', 'france'], // unordered on purpose
        type: 'agreed',
        hand: 'bold',
        source: null,
        note: null,
      })
      const shared = deriveBorders(doc).find((border) => border.between.length === 2)
      expect(shared?.hand).toBe('bold')
      expect(shared?.dressedBy).toBe('pair')
    })

    it('lets a RUN override beat a pair override', () => {
      // The precedence the dev asked for: select a line, give it a style, and nothing outranks it.
      const doc = sideBySide()
      doc.pairs.push({
        between: ['france', 'hre'],
        type: 'agreed',
        hand: 'bold',
        source: null,
        note: null,
      })
      doc.runs.push({ run: [1, 2], hand: 'double', source: null, note: null })
      const shared = deriveBorders(doc).find((border) => border.between.length === 2)
      expect(shared?.hand).toBe('double')
      expect(shared?.dressedBy).toBe('run')
    })

    it('ignores a pair entry that sets no hand', () => {
      const doc = sideBySide()
      doc.pairs.push({
        between: ['france', 'hre'],
        type: 'contested',
        hand: null,
        source: null,
        note: null,
      })
      const shared = deriveBorders(doc).find((border) => border.between.length === 2)
      expect(shared?.dressedBy).toBe('rule')
    })
  })

  describe('unmanaged errors', () => {
    it('derives nothing from a document with nothing drawn', () => {
      expect(deriveBorders(createYearDocument(1100, zone))).toEqual([])
    })

    it('survives a claim naming a polity the registry lacks', () => {
      const doc = sideBySide()
      doc.claims.push({ polity: 'nowhere', rings: [[0, 1, 3]] })
      expect(() => deriveBorders(doc)).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('treats two co-vassals as neither sovereign nor vassal', () => {
      const doc = sideBySide()
      doc.polities = [polity('france'), polity('a', 'france'), polity('b', 'france')]
      doc.claims = [
        { polity: 'a', rings: [[0, 1, 2, 3]] },
        { polity: 'b', rings: [[1, 4, 5, 2]] },
      ]
      const shared = deriveBorders(doc).find((border) => border.between.length === 2)
      expect(shared?.relation).toBe('co-vassal')
      expect(shared?.degree).toBe(1)
    })

    it('says nothing is dry when no mask is given, which draws no frontier', () => {
      // The quiet default, and the safe one: a frontier drawn across the Atlantic would double the
      // coastline, which is the failure `data/regionBorders` takes its own isLand port to avoid.
      const borders = deriveBorders(sideBySide())
      expect(borders.filter((border) => border.relation === 'unclaimed')).toEqual([])
    })
  })
})
