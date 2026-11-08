import { describe, expect, it } from 'vitest'

import { yearClaimSchema } from '../data/yearFormat'

import { documentFaults } from './documentFaults'
import { sharedBorderDocument } from './documentFixtures'
import { edgePosition, eraseEdge, openAt } from './eraseEdge'

// CARTO-397 — the dev, 2026-11-08: "il faudrait qu'on puisse enlever un trait entre deux points"; a shared edge leaves
// both polities ("c'est spécialement pour les lacs"). The fixture: France 0 → 1 → 2 → 3, the Empire 1 → 4 → 5 → 2,
// sharing the edge 1–2.

/**
 * A claim of the fixture.
 * @param doc - the document
 * @param polity - whose claim
 * @returns the claim
 */
function claimOf(doc: ReturnType<typeof sharedBorderDocument>, polity: string) {
  const claim = doc.claims.find((each) => each.polity === polity)
  if (claim === undefined) throw new Error(`no claim for ${polity}`)
  return claim
}

describe('eraseEdge — L2 variants: where an edge is', () => {
  it('finds an edge either way round a closed ring, the closing one included', () => {
    expect(edgePosition([0, 1, 2, 3], false, 1, 2)).toBe(1)
    expect(edgePosition([0, 1, 2, 3], false, 2, 1)).toBe(1)
    expect(edgePosition([0, 1, 2, 3], false, 3, 0)).toBe(3)
  })

  it('never finds the line joining an open outline’s two ends', () => {
    expect(edgePosition([0, 1, 2, 3], true, 3, 0)).toBe(-1)
  })

  it('answers -1 for two anchors not next to each other', () => {
    expect(edgePosition([0, 1, 2, 3], false, 0, 2)).toBe(-1)
  })
})

describe('eraseEdge — L2 variants: what an outline becomes', () => {
  it('turns a closed ring into one open outline from the anchor after the edge round to the one before', () => {
    expect(openAt([0, 1, 2, 3], false, 1)).toEqual({ pieces: [[2, 3, 0, 1]], dropped: 0 })
  })

  it('opens a closed ring at its closing edge without moving anything', () => {
    expect(openAt([0, 1, 2, 3], false, 3)).toEqual({ pieces: [[0, 1, 2, 3]], dropped: 0 })
  })

  it('cuts an open outline in two at an inner edge', () => {
    expect(openAt([0, 1, 2, 3], true, 1)).toEqual({
      pieces: [
        [0, 1],
        [2, 3],
      ],
      dropped: 0,
    })
  })

  it('drops a piece left with one anchor — an outline needs two', () => {
    expect(openAt([0, 1, 2, 3], true, 0)).toEqual({ pieces: [[1, 2, 3]], dropped: 1 })
  })
})

describe('eraseEdge — L1 happy path, L3 managed errors, L5 edge cases', () => {
  // L4: N/A — pure, synchronous, no input it does not read; an anchor out of the table is simply not on any edge.
  it('opens both polities’ outlines at an edge they share', () => {
    const doc = sharedBorderDocument()

    const erasure = eraseEdge(doc, 1, 2)

    expect(erasure).toEqual({
      polities: ['fr-couronne', 'hre'],
      opened: 2,
      cut: 0,
      dropped: 0,
      removed: 0,
    })
    expect(claimOf(doc, 'fr-couronne')).toMatchObject({ rings: [[2, 3, 0, 1]], open: [0] })
    // The Empire's edge 2–1 is its closing one: opened there, its ring reads as it was.
    expect(claimOf(doc, 'hre')).toMatchObject({ rings: [[1, 4, 5, 2]], open: [0] })
  })

  it('removes no anchor: the table and every point stay', () => {
    const doc = sharedBorderDocument()
    const anchors = doc.anchors.map((point) => [...point])

    eraseEdge(doc, 1, 2)

    expect(doc.anchors).toEqual(anchors)
  })

  it('opens only the polity drawing an edge no one shares', () => {
    const doc = sharedBorderDocument()

    const erasure = eraseEdge(doc, 0, 1)

    expect(erasure?.polities).toEqual(['fr-couronne'])
    expect(claimOf(doc, 'hre').open).toBeUndefined()
  })

  it('cuts an open outline in two, both pieces open', () => {
    const doc = sharedBorderDocument()
    eraseEdge(doc, 0, 1)

    const erasure = eraseEdge(doc, 2, 3)

    expect(erasure).toEqual({
      polities: ['fr-couronne'],
      opened: 0,
      cut: 1,
      dropped: 0,
      removed: 0,
    })
    expect(claimOf(doc, 'fr-couronne')).toMatchObject({
      rings: [
        [1, 2],
        [3, 0],
      ],
      open: [0, 1],
    })
  })

  it('removes a two-anchor open outline whole when its only edge goes, and says so in the count', () => {
    const doc = sharedBorderDocument()
    eraseEdge(doc, 0, 1)
    eraseEdge(doc, 2, 3)

    // France holds [1, 2] and [3, 0]; the edge 3–0 is France's alone.
    const erasure = eraseEdge(doc, 3, 0)

    expect(erasure).toEqual({
      polities: ['fr-couronne'],
      opened: 0,
      cut: 0,
      dropped: 0,
      removed: 1,
    })
    expect(claimOf(doc, 'fr-couronne')).toMatchObject({ rings: [[1, 2]], open: [0] })
    expect(documentFaults(doc)).toEqual([])
  })

  it('counts the single-anchor piece a cut leaves out, the other piece kept', () => {
    const doc = sharedBorderDocument()
    eraseEdge(doc, 0, 1)

    // France's open outline [1, 2, 3, 0] cut at its last edge: [1, 2, 3] stays, [0] alone goes.
    const erasure = eraseEdge(doc, 3, 0)

    expect(erasure).toEqual({
      polities: ['fr-couronne'],
      opened: 0,
      cut: 1,
      dropped: 1,
      removed: 0,
    })
    expect(claimOf(doc, 'fr-couronne')).toMatchObject({ rings: [[1, 2, 3]], open: [0] })
  })

  it('answers null and changes nothing for an edge no outline draws', () => {
    const doc = sharedBorderDocument()
    const before = JSON.stringify(doc.claims)

    expect(eraseEdge(doc, 0, 2)).toBeNull()
    expect(JSON.stringify(doc.claims)).toBe(before)
  })

  it('leaves claims the schema reads and the document faults find nothing in', () => {
    const doc = sharedBorderDocument()

    eraseEdge(doc, 1, 2)
    eraseEdge(doc, 3, 0)

    for (const claim of doc.claims) expect(yearClaimSchema.safeParse(claim).success).toBe(true)
    expect(documentFaults(doc)).toEqual([])
  })
})
