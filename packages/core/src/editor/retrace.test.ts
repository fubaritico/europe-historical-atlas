import { describe, expect, it } from 'vitest'

import { insertAnchorOnStretch } from './anchorEdits'
import { sharedBorderDocument } from './documentFixtures'
import { checkRetrace, isRetraceRefusal, retraceArcs, retraceStretch } from './retrace'
import { cloneYearDocument } from './yearDocument'

import type { OutlinePoint } from './documentEdits'
import type { YearDocument } from './yearDocument'

const BY_EYE = { name: 'reported by eye', licence: 'fact' }

/** A new point reported by eye. */
function free(lon: number, lat: number): OutlinePoint {
  return { at: [lon, lat], provenance: BY_EYE, anchor: null }
}

/** An existing anchor, met by the new run. */
function joined(doc: YearDocument, index: number): OutlinePoint {
  const at = doc.anchors[index]
  if (at === undefined) throw new Error(`anchor ${String(index)} missing`)
  return { at, provenance: BY_EYE, anchor: index }
}

/** A polity's first ring. */
function ringOf(doc: YearDocument, polity: string): number[] {
  return doc.claims.find((claim) => claim.polity === polity)?.rings[0] ?? []
}

/** The ring walked from one of its anchors, so two rotations of one ring compare equal. */
function from(ring: readonly number[], start: number): number[] {
  const at = ring.indexOf(start)
  return [...ring.slice(at), ...ring.slice(0, at)]
}

/** France [0,1,2,3] and the Empire [1,4,5,2], sharing 1–6–2 (6 at 2°E 47°N). */
function borderWithMiddle(): { doc: YearDocument; middle: number } {
  const doc = sharedBorderDocument()
  const middle = insertAnchorOnStretch(doc, 1, 2, [2, 47], BY_EYE)
  if (middle === null) throw new Error('the fixture has no 1–2 stretch')
  return { doc, middle }
}

describe('retrace', () => {
  describe('happy path', () => {
    // H-46 — the stretch is replaced, and the neighbour on it follows: never a second geometry.
    it('replaces a shared stretch in both rings, the neighbour following', () => {
      const { doc, middle } = borderWithMiddle()
      const result = retraceStretch(doc, 'fr-couronne', 1, 2, [middle], [free(2.5, 47)])
      const added = doc.anchors.length - 1
      expect(result).toEqual({ removed: 1, added: 1, neighbours: ['hre'], untouched: [] })
      expect(from(ringOf(doc, 'fr-couronne'), 1)).toEqual([1, added, 2, 3, 0])
      expect(from(ringOf(doc, 'hre'), 1)).toEqual([1, 4, 5, 2, added])
      expect(doc.anchors[added]).toEqual([2.5, 47])
    })

    it('gives both ways round between two anchors, each walked from the start', () => {
      const { doc, middle } = borderWithMiddle()
      expect(retraceArcs(doc, 'fr-couronne', 1, 2)).toEqual({
        ring: ringOf(doc, 'fr-couronne'),
        forward: [middle],
        backward: [0, 3],
      })
    })
  })

  describe('variants', () => {
    // The dev, 2026-10-14: "c'est les Obotrites qui comptent" — a ring that only touches the stretch is
    // not edited for it, and is named.
    it('replaces a stretch through a junction, the polity met there keeping its points', () => {
      const doc = sharedBorderDocument()
      const empire = [...ringOf(doc, 'hre')]
      const result = retraceStretch(doc, 'fr-couronne', 0, 2, [1], [free(1.5, 47.5)])
      expect(result).toEqual({ removed: 1, added: 1, neighbours: [], untouched: ['hre'] })
      expect(ringOf(doc, 'hre')).toEqual(empire)
      expect(ringOf(doc, 'fr-couronne')).not.toContain(1)
    })

    it('names a deliberate gap that meets the stretch without running over it, and leaves it', () => {
      const { doc, middle } = borderWithMiddle()
      doc.deliberateGaps.push({ ring: [middle, 4, 5], reason: 'a march' })
      expect(retraceStretch(doc, 'fr-couronne', 1, 2, [middle], [])).toMatchObject({
        untouched: [null],
      })
      expect(doc.deliberateGaps[0]?.ring).toEqual([middle, 4, 5])
    })

    it('replaces the other way round, the run laid from the start towards the end', () => {
      const doc = sharedBorderDocument()
      doc.claims = doc.claims.filter((claim) => claim.polity === 'fr-couronne')
      const result = retraceStretch(doc, 'fr-couronne', 0, 1, [3, 2], [free(1, 44)])
      const added = doc.anchors.length - 1
      expect(result).toEqual({ removed: 2, added: 1, neighbours: [], untouched: [] })
      expect(from(ringOf(doc, 'fr-couronne'), 0)).toEqual([0, 1, added])
    })

    it('straightens a stretch into one segment with an empty run', () => {
      const { doc, middle } = borderWithMiddle()
      expect(retraceStretch(doc, 'fr-couronne', 1, 2, [middle], [])).toEqual({
        removed: 1,
        added: 0,
        neighbours: ['hre'],
        untouched: [],
      })
      expect(ringOf(doc, 'fr-couronne')).not.toContain(middle)
      expect(ringOf(doc, 'hre')).not.toContain(middle)
    })

    it('inserts between two adjacent anchors when the stretch between them is empty', () => {
      const doc = sharedBorderDocument()
      retraceStretch(doc, 'fr-couronne', 0, 1, [], [free(1, 49)])
      expect(from(ringOf(doc, 'fr-couronne'), 0)).toEqual([0, doc.anchors.length - 1, 1, 2, 3])
    })

    // H-06 — an anchor met by the new run is that anchor, not a copy.
    it('reuses an existing anchor the new run lands on, adding none for it', () => {
      const doc = sharedBorderDocument()
      const count = doc.anchors.length
      const result = retraceStretch(doc, 'fr-couronne', 0, 1, [], [joined(doc, 5)])
      expect(result).toEqual({ removed: 0, added: 1, neighbours: [], untouched: [] })
      expect(doc.anchors.length).toBe(count)
      expect(from(ringOf(doc, 'fr-couronne'), 0)).toEqual([0, 5, 1, 2, 3])
    })

    it('carries the new run into a deliberate gap that runs over the stretch', () => {
      const { doc, middle } = borderWithMiddle()
      doc.deliberateGaps.push({ ring: [2, middle, 1, 7], reason: 'a march' })
      doc.anchors.push([3, 50])
      doc.anchorSource.push(0)
      retraceStretch(doc, 'fr-couronne', 1, 2, [middle], [free(2.5, 47)])
      expect(doc.deliberateGaps[0]?.ring).toContain(doc.anchors.length - 1)
      expect(doc.deliberateGaps[0]?.ring).not.toContain(middle)
    })
  })

  describe('managed errors', () => {
    it('refuses a stretch a border dressed by hand runs over', () => {
      const { doc, middle } = borderWithMiddle()
      doc.runs.push({ run: [1, middle], hand: 'dotted', source: null, note: null })
      expect(retraceStretch(doc, 'fr-couronne', 1, 2, [middle], [])).toEqual({
        kind: 'dressed-run',
      })
    })

    it('refuses a new run through an anchor a following ring keeps', () => {
      const { doc, middle } = borderWithMiddle()
      // The Empire follows the stretch and already holds 4: it would visit it twice.
      expect(retraceStretch(doc, 'fr-couronne', 1, 2, [middle], [joined(doc, 4)])).toEqual({
        kind: 'loop',
        polity: 'hre',
      })
    })

    it('refuses a new run that lands twice on one anchor', () => {
      const doc = sharedBorderDocument()
      const twice = [joined(doc, 5), joined(doc, 5)]
      expect(retraceStretch(doc, 'fr-couronne', 0, 1, [], twice)).toEqual({
        kind: 'loop',
        polity: 'fr-couronne',
      })
    })

    it('refuses a ring left too short to enclose an area', () => {
      const doc = sharedBorderDocument()
      doc.claims = doc.claims.filter((claim) => claim.polity === 'fr-couronne')
      expect(retraceStretch(doc, 'fr-couronne', 0, 1, [3, 2], [])).toEqual({
        kind: 'too-short',
        polity: 'fr-couronne',
      })
    })

    it('refuses two anchors no ring of the polity holds together', () => {
      const doc = sharedBorderDocument()
      expect(retraceStretch(doc, 'fr-couronne', 0, 4, [], [])).toEqual({ kind: 'no-ring' })
      expect(retraceArcs(doc, 'fr-couronne', 0, 0)).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a stretch that is neither way round between the anchors', () => {
      const doc = sharedBorderDocument()
      expect(retraceStretch(doc, 'fr-couronne', 1, 2, [3], [])).toEqual({ kind: 'not-an-arc' })
    })

    it('refuses a point naming an anchor the document does not hold', () => {
      const doc = sharedBorderDocument()
      const ghost = { at: [9, 9] as [number, number], provenance: BY_EYE, anchor: 99 }
      expect(retraceStretch(doc, 'fr-couronne', 0, 1, [], [ghost])).toEqual({
        kind: 'bad-anchor',
      })
    })
  })

  describe('edge cases', () => {
    it('writes nothing when it refuses', () => {
      const doc = sharedBorderDocument()
      const before = cloneYearDocument(doc)
      retraceStretch(doc, 'fr-couronne', 1, 2, [3], [free(1.5, 47.5)])
      expect(doc).toEqual(before)
    })

    it('checks the same stretch the edit replaces, naming the neighbours that follow', () => {
      const { doc, middle } = borderWithMiddle()
      const check = checkRetrace(doc, 'fr-couronne', 1, 2, [middle])
      expect(isRetraceRefusal(check)).toBe(false)
      if (!isRetraceRefusal(check)) expect(check.neighbours).toEqual(['hre'])
    })

    it('reads a polity with no territory as holding no ring', () => {
      const doc = sharedBorderDocument()
      expect(retraceArcs(doc, 'nobody', 0, 1)).toBeNull()
    })
  })
})
