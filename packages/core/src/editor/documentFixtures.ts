/**
 * Documents to test against — the shapes that carry the model's guarantees, in one place.
 *
 * **Test-only, and deliberately in the source tree rather than inside one test file.** Two polities sharing
 * a run of anchors is the case every guarantee in this layer turns on, so more than one suite needs it, and
 * a fixture copied between suites can drift from the thing it is meant to verify — which is worse than a
 * copy in source, because nothing fails when the two disagree.
 *
 * Imported by tests only, so it never reaches a bundle.
 */

import { addAnchor, closeRing } from './documentEdits'
import { createYearDocument } from './yearDocument'

import type { YearDocument } from './yearDocument'
import type { YearPolity } from '../data/yearFormat'
import type { GeoBounds } from '../geo/mercator'

/** The editorial window the author works in, distinct from the render frame. */
export const FIXTURE_ZONE: GeoBounds = { west: -45, south: 20, east: 60, north: 76 }

/** One declared provenance, enough for anchors to point at something. */
export const FIXTURE_SOURCES = [
  { id: 0, name: 'reported by eye — Duby (reference)', licence: 'fact' },
]

/**
 * Two polities sharing a run of anchors along their common limit, which is the case that matters.
 *
 * France holds the western square, the Empire the eastern one. **Anchors 1 and 2 are the shared limit** —
 * both rings run over them, so moving either moves both, and any operation that breaks that brings back the
 * sliver the format exists to abolish.
 * @returns a fresh document, safe to mutate
 */
export function sharedBorderDocument(): YearDocument {
  const doc = createYearDocument(1100, FIXTURE_ZONE, FIXTURE_SOURCES)
  for (const point of [
    [0, 48],
    [2, 48],
    [2, 46],
    [0, 46],
    [4, 48],
    [4, 46],
  ] as [number, number][])
    addAnchor(doc, point, 0)

  doc.polities.push(
    {
      id: 'fr-couronne',
      name: 'Reaume de France',
      rank: 'kingdom',
      status: 'country',
      suzerain: null,
      existsFrom: 987,
      existsTo: null,
      colour: null,
      wikidata: null,
    },
    {
      id: 'hre',
      name: 'Sacrum Imperium',
      rank: 'empire',
      status: 'country',
      suzerain: null,
      existsFrom: 962,
      existsTo: null,
      colour: null,
      wikidata: null,
    }
  )
  closeRing(doc, 'fr-couronne', [0, 1, 2, 3])
  closeRing(doc, 'hre', [1, 4, 5, 2])
  return doc
}

/**
 * Resolve a claim's first ring into coordinates, the way a renderer would.
 *
 * The indirection is the point: asserting on coordinates is what shows two outlines moving together, which
 * asserting on indices cannot.
 * @param doc - the document to read
 * @param polityId - whose claim to resolve
 * @returns the ring's points, in order
 * @throws when a ring holds an index the anchor table does not, which no operation produces
 */
export function ringOf(doc: YearDocument, polityId: string): [number, number][] {
  const claim = doc.claims.find((existing) => existing.polity === polityId)
  return (claim?.rings[0] ?? []).map((index) => {
    const anchor = doc.anchors[index]
    if (anchor === undefined) throw new Error(`anchor ${String(index)} missing`)
    return [anchor[0], anchor[1]]
  })
}

/**
 * The anchor indices two polities' first rings both hold.
 * @param doc - the document to read
 * @param a - one polity's id
 * @param b - the other's
 * @returns the shared indices, in the first polity's order
 */
export function sharedAnchorsBetween(doc: YearDocument, a: string, b: string): number[] {
  const ringA = doc.claims.find((claim) => claim.polity === a)?.rings[0] ?? []
  const ringB = doc.claims.find((claim) => claim.polity === b)?.rings[0] ?? []
  return ringA.filter((index) => ringB.includes(index))
}

/**
 * The first anchor the two fixture polities both hold — the only one worth moving to show sharing.
 *
 * Throws rather than returning `undefined`, because a fixture that shares no anchor is a broken fixture and
 * not a case under test: every assertion built on it would pass for the wrong reason.
 * @param doc - the document to read
 * @returns the shared anchor's index
 * @throws when the two polities share nothing, which means the fixture itself is wrong
 */
export function firstSharedAnchor(doc: YearDocument): number {
  const index = sharedAnchorsBetween(doc, 'fr-couronne', 'hre')[0]
  if (index === undefined) throw new Error('fixture: the two polities share no anchor')
  return index
}

/**
 * An identity with no territory, for the suites that create one.
 *
 * **It lives here because it drifted when it did not.** Written out independently in two Cartographer
 * suites on 2026-10-08, the two copies disagreed on `colour` within the hour and **no test failed** —
 * neither asserts it. That is the exact failure this module's header names, so the copy came here rather
 * than being tidied in place.
 *
 * **A plain `YearPolity` and not a store helper**, which is the line worth keeping: anything that calls
 * `createCartographerStore` belongs to the Cartographer and cannot come down here. This is only the
 * identity, so `core`'s own suites can use it too — `s07`'s bulk import will want exactly this shape.
 *
 * `colour` is **null**, like the two polities of {@link sharedBorderDocument}: the palette deciding is the
 * normal state, and a suite needing a pinned one declares its own rather than making this one lie.
 *
 * It is deliberately **not** in {@link sharedBorderDocument} — `drawingTarget`'s suite asserts that
 * `aquitaine` resolves to nobody in that document, which is how "the target stopped resolving" is tested.
 */
export const AQUITAINE_IDENTITY: YearPolity = {
  id: 'aquitaine',
  name: 'Duché d’Aquitaine',
  rank: 'duchy',
  status: 'country',
  suzerain: 'fr-couronne',
  existsFrom: 1058,
  existsTo: null,
  colour: null,
  wikidata: null,
}
