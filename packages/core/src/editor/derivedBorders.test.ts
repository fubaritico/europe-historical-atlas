import { describe, expect, it } from 'vitest'

import { borderRunsOf, collectBorderEdges } from './borderGraph'
import { coastSourceIds, deriveBorders } from './derivedBorders'
import { addAnchor, addPolity, closeRing } from './documentEdits'
import { createYearDocument } from './yearDocument'

import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'

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
  const doc = createYearDocument(1100, source)
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
  const doc = createYearDocument(1100, source)
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
      expect(collectBorderEdges(createYearDocument(1100)).size).toBe(0)
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
      expect(borderRunsOf(createYearDocument(1100))).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('stops a chain at a pinch rather than choosing a direction arbitrarily', () => {
      // Three edges of the same owner meeting at one point: two runs is right, one wrong run is not.
      const doc = createYearDocument(1100, source)
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

    // H-44, 2026-10-15: the Empire's own ring, cleared by hand from under Bohemia, still ran along Bohemia's
    // limit with unclaimed ground — no width — and that limit came out dotted, Bohemia against the Empire.
    it('ignores a lord whose outline runs along its vassal with no ground behind it', () => {
      const doc = createYearDocument(1100, source)
      anchors(doc, [
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
        [-10, 10],
        [-10, 0],
      ])
      addPolity(doc, polity('hre'))
      addPolity(doc, polity('bohemia', 'hre'))
      closeRing(doc, 'bohemia', [0, 1, 2, 3])
      // The Empire beside Bohemia to the west, its ring running out along Bohemia's north and east sides
      // and back the same way: a path of no width there, chained with the real west limit into one run.
      closeRing(doc, 'hre', [3, 0, 1, 2, 1, 0, 4, 5])
      const borders = deriveBorders(doc, { isLand: () => true })
      const east = borders.find((border) => border.run.includes(1) && border.run.includes(2))
      const west = borders.find((border) => border.run.includes(3) && border.run.includes(0))
      expect(east?.between).toEqual(['bohemia'])
      expect(east?.relation).toBe('unclaimed')
      expect(west?.relation).toBe('vassal')
    })

    it('draws a coast a vassal shares with its lord, from the same side, as coast', () => {
      const doc = coastAndLand()
      addPolity(doc, polity('normandy', 'france'))
      addAnchor(doc, [5, 5], 0)
      closeRing(doc, 'normandy', [2, 3, 4])
      const coast = deriveBorders(doc, { isLand: () => false, coastSources: new Set([1]) }).find(
        (border) => border.run.includes(2) && border.run.includes(3) && border.run.length === 2
      )
      expect(coast?.relation).toBe('coastline')
    })

    it('keeps the vassal hand where only the vassal and its lord hold the stretch', () => {
      const doc = sideBySide()
      addPolity(doc, polity('aquitaine', 'france'))
      closeRing(doc, 'aquitaine', [1, 2, 3])
      // Anchor 1 is on France's own chain as well, so looking it up by index alone finds the wrong run.
      // What identifies the stretch is who holds it.
      const shared = deriveBorders(doc).find(
        (border) => border.between.includes('aquitaine') && border.between.includes('france')
      )
      expect(shared?.relation).toBe('vassal')
    })

    // H-44, 2026-10-15: Bohemia, the Empire and Poland on one stretch — the Empire tied with Poland on depth
    // and won by document order, so the Bohemia–Poland frontier came out dotted.
    it('drops the lord from a stretch its vassal holds against a foreign polity', () => {
      const doc = sideBySide()
      addPolity(doc, polity('aquitaine', 'france'))
      closeRing(doc, 'aquitaine', [1, 2, 3])
      const stretch = deriveBorders(doc).find(
        (border) => border.run.length === 2 && border.run.includes(1) && border.run.includes(2)
      )
      expect([...(stretch?.between ?? [])].sort()).toEqual(['aquitaine', 'hre'])
      expect(stretch?.relation).toBe('sovereign')
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
      expect(deriveBorders(createYearDocument(1100))).toEqual([])
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

/**
 * One square polity, its west and south sides taken from the coast (source 1), its east and north reported
 * by eye (source 0): `0 (0,10) → 1 (10,10) → 2 (10,0) → 3 (0,0)`. North and east are sides 0→1 and 1→2.
 */
function coastAndLand(clockwise = true): YearDocument {
  const doc = createYearDocument(1100, [
    ...source,
    { id: 1, name: 'Natural Earth 10m land minus lakes', licence: 'public domain' },
  ])
  addAnchor(doc, [0, 10], 0)
  addAnchor(doc, [10, 10], 0)
  addAnchor(doc, [10, 0], 1)
  addAnchor(doc, [0, 0], 1)
  addPolity(doc, polity('france'))
  closeRing(doc, 'france', clockwise ? [0, 1, 2, 3] : [3, 2, 1, 0])
  return doc
}

/** Land east of 10°: the far side of the east limit is dry, every other far side is sea. */
const eastIsLand = (lon: number): boolean => lon > 10

// The 1100 France of 2026-10-13: its whole outer limit was one run, asked once at its midpoint, so every
// coast came out as a frontier against unclaimed ground (1 042 anchors).
describe('deriveBorders — the far side, segment by segment', () => {
  describe('happy path', () => {
    it('cuts a polity’s outer limit where the far side turns from land to sea', () => {
      const borders = deriveBorders(coastAndLand(), { isLand: eastIsLand })
      const unclaimed = borders.filter((border) => border.relation === 'unclaimed')
      const coast = borders.filter((border) => border.relation === 'coastline')
      expect(unclaimed.map((border) => border.run)).toEqual([[1, 2]])
      expect(coast.flatMap((border) => border.run)).toEqual(expect.arrayContaining([0, 2, 3]))
    })
  })

  describe('variants', () => {
    it('finds the outside whichever way the ring is walked', () => {
      const borders = deriveBorders(coastAndLand(false), { isLand: eastIsLand })
      const unclaimed = borders.filter((border) => border.relation === 'unclaimed')
      expect(unclaimed.map((border) => [...border.run].sort())).toEqual([[1, 2]])
    })

    it('reads a segment between two coast anchors as coast, whatever the mask says beyond it', () => {
      // A narrow estuary: stepped outward, the mask finds the far bank — dry everywhere.
      const borders = deriveBorders(coastAndLand(), {
        isLand: () => true,
        coastSources: new Set([1]),
      })
      const coast = borders.filter((border) => border.relation === 'coastline')
      expect(coast.map((border) => border.run)).toEqual([[2, 3]])
    })

    // 2026-10-15, the Dalmatian islands given to Venice: the Velebit channel is narrower than the far-side
    // offset, so each coast was asked its far side inside the other's ring — ten Venice–Croatia frontiers.
    it('reads two coasts facing each other across a channel narrower than the offset as coast', () => {
      const doc = coastAndLand()
      const island = [
        addAnchor(doc, [2, -0.02], 1),
        addAnchor(doc, [8, -0.02], 1),
        addAnchor(doc, [8, -0.5], 1),
        addAnchor(doc, [2, -0.5], 1),
      ]
      addPolity(doc, polity('venice'))
      closeRing(doc, 'venice', island)
      const borders = deriveBorders(doc, { isLand: () => false, coastSources: new Set([1]) })
      expect(borders.filter((border) => border.between.length === 2)).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('falls back on the mask when no coast source is named', () => {
      const borders = deriveBorders(coastAndLand(), { isLand: () => true })
      expect(borders.every((border) => border.relation === 'unclaimed')).toBe(true)
    })
  })

  // L4: N/A — the readers refuse a document whose anchors or sources are missing; the derivation skips a
  // segment whose anchor is absent, covered by 'survives a claim naming a polity the registry lacks'.

  describe('edge cases', () => {
    it('does not take a segment with only one coast end for coast', () => {
      // South (2→3) is coast at both ends; east (1→2) has one coast end and stays the mask's to judge.
      const borders = deriveBorders(coastAndLand(), {
        isLand: () => true,
        coastSources: new Set([1]),
      })
      expect(
        borders.find((border) => border.run.includes(1) && border.run.includes(2))?.relation
      ).toBe('unclaimed')
    })
  })
})

/** France and the Empire sharing a three-segment limit, 1 → 6 → 7 → 2. */
function longShared(): YearDocument {
  const doc = createYearDocument(1100, source)
  anchors(doc, [
    [0, 10],
    [10, 10],
    [10, 0],
    [0, 0],
    [20, 10],
    [20, 0],
    [10, 7],
    [10, 3],
  ])
  addPolity(doc, polity('france'))
  addPolity(doc, polity('hre'))
  closeRing(doc, 'france', [0, 1, 6, 7, 2, 3])
  closeRing(doc, 'hre', [1, 4, 5, 2, 7, 6])
  return doc
}

// 2026-10-13: a run override dressed any border sharing ONE anchor with it — eleven segments of the Saône
// would have restyled the whole limit. `s13` wants half a border bold and the other half not.
describe('deriveBorders — a run override dresses its own segments only', () => {
  it('cuts the shared limit where the override ends, and dresses only the covered stretch', () => {
    const doc = longShared()
    doc.runs.push({ run: [6, 7], hand: 'dotted', source: null, note: null })
    const shared = deriveBorders(doc).filter((border) => border.between.length === 2)
    const dotted = shared.filter((border) => border.hand === 'dotted')
    expect(dotted.map((border) => [...border.run].sort())).toEqual([[6, 7]])
    expect(dotted[0]?.dressedBy).toBe('run')
    expect(shared.filter((border) => border.dressedBy === 'rule').length).toBeGreaterThan(0)
  })

  it('does not dress a border that only touches the override at one anchor', () => {
    const doc = longShared()
    doc.runs.push({ run: [0, 1], hand: 'dotted', source: null, note: null })
    const shared = deriveBorders(doc).filter((border) => border.between.length === 2)
    expect(shared.every((border) => border.hand === null)).toBe(true)
  })
})

/** A document holding one anchor under the coast's own source, and its sources table. */
function shoreDocument(): YearDocument {
  const doc = createYearDocument(1100, [...source, { id: 1, name: 'Shore', licence: 'CC0' }])
  addAnchor(doc, [0, 0], 1)
  return doc
}

describe('coastSourceIds', () => {
  it('finds the sources recorded under the mask’s name, without its licence', () => {
    expect(coastSourceIds(shoreDocument(), 'Shore (CC0)')).toEqual(new Set([1]))
  })

  it('finds none for a mask whose source names no licence', () => {
    expect(coastSourceIds(shoreDocument(), 'Shore')).toEqual(new Set())
  })

  it('finds none when the document never took from that mask', () => {
    expect(coastSourceIds(shoreDocument(), 'Elsewhere (CC0)')).toEqual(new Set())
  })
})
