import {
  addOverlap,
  overlapCandidates,
  pairOverlap,
  polityShape,
} from '@europe-historical-atlas/core/data/overlaps'

import type { Overlap, PolityShape } from '@europe-historical-atlas/core/data/overlaps'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/** A ground, in longitude and latitude — the geometry's own shape, read through core. */
type MultiPolygon = Overlap['area']

/**
 * Where the polities' outlines overlap, for the hatching (CARTO-364) — computed again only where a gesture moved
 * something.
 *
 * **Keyed as the tribes' images are** (`tribeFeatherCache`): the edition's version first, so a pan costs one
 * comparison; then, when it moves, each polity is matched against its last shape by what its shape reads — its
 * rings' coordinates, claim by claim. A pair is intersected again only when one of its two shapes was made again.
 * Measured 2026-11-06 on the dev's 1100, 107 polities: every shape and every pair from nothing, ~0.8 s — once, at the
 * opening; a gesture on one polity, the pairs it is in, tens of milliseconds.
 *
 * **A shape or a pair the geometry refuses is skipped, and said** (the dev, 2026-11-06: the pair left unhatched, the
 * console, and an error dialogue): the cache hands the refusals back with the overlaps, and the caller says them.
 */

/** A point, in backdrop pixels. */
type Point = readonly [number, number]

/** One overlap, in backdrop pixels. */
export interface OverlapPiece {
  /** Every polity covering it. */
  polities: readonly string[]
  /** Its rings, even-odd, in backdrop pixels. */
  rings: readonly (readonly Point[])[]
}

/** One refusal of the geometry. */
export interface Refusal {
  /** The polity, or the first of the pair. */
  a: string
  /** The second of the pair; `null` when the refusal is the shape of `a` alone. */
  b: string | null
}

/** What the cache answers for one version. */
export interface OverlapAnswer {
  /** The overlaps, each piece once. */
  pieces: readonly OverlapPiece[]
  /**
   * What the geometry refused at this version: a pair's overlap (`b` its second polity), or one polity's shape (`b`
   * `null`), whose overlaps then all go unhatched.
   */
  refused: readonly Refusal[]
}

/** The cache. */
export interface OverlapCache {
  /**
   * The overlaps of a document.
   * @param document - the document to read
   * @param version - the edition's version counter
   * @returns the overlaps and the refusals — the same object for the same version
   */
  overlapsOf: (document: YearDocument, version: number) => OverlapAnswer
}

/** One polity as last shaped: what its shape read, and the shape — `null` when it encloses nothing. */
interface MadeShape {
  /** What its shape read. */
  signature: readonly number[]
  /** Its shape. */
  shape: PolityShape | null
}

/** One pair as last intersected: the two shapes it read, and what they share. */
interface MadePair {
  /** The first shape. */
  a: PolityShape
  /** The second. */
  b: PolityShape
  /** What they share. */
  area: MultiPolygon
}

/**
 * What a polity's shape reads: for each claim its count of rings — rings are combined even-odd within a claim and
 * united across claims, so the same rings grouped otherwise are another shape (review QUAL-002) — then each ring's
 * length and its points. **Not whether a ring is open**: the shape closes every ring by the line between its ends,
 * open or not, as the fill is painted — opening one changes no ground (review QUAL-003, answered by the geometry).
 * @param document - the document
 * @param polity - the polity
 * @returns the numbers, compared one by one
 */
function signatureOf(document: YearDocument, polity: string): number[] {
  const out: number[] = []
  for (const claim of document.claims) {
    if (claim.polity !== polity) continue
    out.push(-claim.rings.length)
    for (const ring of claim.rings) {
      out.push(ring.length)
      // An index with no anchor cannot be produced by any operation (`removePolity` drops a claim, never a point); the
      // shape leaves it out as the fill does (`projectedRings`), and the signature keeps its place so the counts align.
      for (const index of ring) out.push(...(document.anchors[index] ?? [Number.NaN, Number.NaN]))
    }
  }
  return out
}

/**
 * Whether two signatures read the same.
 * @param a - one
 * @param b - the other
 * @returns `true` when every number is the same
 */
function sameSignature(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, i) => Object.is(value, b[i]))
}

/**
 * The reason a refusal gives, for the console.
 * @param error - what the geometry threw
 * @returns its message
 */
function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** What the cache keeps between two versions. */
interface Kept {
  /** Each polity's last shape, by id — only the polities of the last version. */
  shapes: Map<string, MadeShape>
  /** Each pair's last share, by the two ids — only the pairs of the last version. */
  pairs: Map<string, MadePair>
  /** Where a refusal is said. */
  log: (message: string) => void
  /** What this version refused so far. */
  refused: Refusal[]
  /**
   * The pairs whose cut against the others was refused, by the two ids, with the shapes it read — the last version's,
   * then this one's. A cut depends on every piece cut before it, so it is tried again at each version; it is said
   * only when it fails on shapes it had not failed on (review ARCH-001), so a gesture elsewhere never says it again.
   */
  cuts: Map<string, MadePair>
}

/**
 * A polity's shape: the last one when what it reads did not move, made again otherwise — `null`, said, when the
 * geometry refuses it.
 * @param kept - what the cache keeps
 * @param last - the shapes of the version before
 * @param document - the document
 * @param polity - the polity
 * @returns its shape, or `null` when it encloses nothing or was refused
 */
function shapeOf(
  kept: Kept,
  last: ReadonlyMap<string, MadeShape>,
  document: YearDocument,
  polity: string
): PolityShape | null {
  const signature = signatureOf(document, polity)
  const before = last.get(polity)
  let shape: PolityShape | null = null
  if (before !== undefined && sameSignature(before.signature, signature)) shape = before.shape
  else {
    try {
      shape = polityShape(document, polity)
    } catch (error) {
      kept.refused.push({ a: polity, b: null })
      kept.log(
        `[Cartographer] the shape of "${polity}" could not be computed, so its overlaps are not hatched: ${reasonOf(error)}`
      )
    }
  }
  kept.shapes.set(polity, { signature, shape })
  return shape
}

/**
 * What two polities share: the last answer when both shapes are the ones it read, intersected again otherwise —
 * nothing, said, when the geometry refuses it.
 * @param kept - what the cache keeps
 * @param last - the pairs of the version before
 * @param a - one shape
 * @param b - the other
 * @returns what they share
 */
function shareOf(
  kept: Kept,
  last: ReadonlyMap<string, MadePair>,
  a: PolityShape,
  b: PolityShape
): MultiPolygon {
  const key = `${a.polity}\u0000${b.polity}`
  const before = last.get(key)
  let area: MultiPolygon = []
  if (before?.a === a && before.b === b) area = before.area
  else {
    try {
      area = pairOverlap(a, b)
    } catch (error) {
      kept.refused.push({ a: a.polity, b: b.polity })
      kept.log(
        `[Cartographer] the overlap of "${a.polity}" and "${b.polity}" could not be computed, so it is not hatched: ${reasonOf(error)}`
      )
    }
  }
  kept.pairs.set(key, { a, b, area })
  return area
}

/**
 * Every overlap of a version, cut into pieces — a pair whose cut the geometry refuses is left out, said.
 * @param kept - what the cache keeps, the version before's shapes and pairs replaced by this one's
 * @param document - the document
 * @returns the pieces, in longitude and latitude
 */
function overlapsAt(kept: Kept, document: YearDocument): Overlap[] {
  const lastShapes = kept.shapes
  const lastPairs = kept.pairs
  kept.shapes = new Map()
  kept.pairs = new Map()
  const made = document.polities.flatMap((polity) => {
    const shape = shapeOf(kept, lastShapes, document, polity.id)
    return shape === null ? [] : [shape]
  })
  const lastCuts = kept.cuts
  kept.cuts = new Map()
  let overlaps: Overlap[] = []
  for (const [a, b] of overlapCandidates(document, made)) {
    const area = shareOf(kept, lastPairs, a, b)
    if (area.length === 0) continue
    try {
      overlaps = addOverlap(document, overlaps, { polities: [a.polity, b.polity], area })
    } catch (error) {
      cutRefused(kept, lastCuts, { a, b, area }, error)
    }
  }
  return overlaps
}

/**
 * Note a refused cut, and say it unless it already failed on the same two shapes at the version before.
 * @param kept - what the cache keeps
 * @param last - the cuts refused at the version before
 * @param pair - the two shapes and what they share
 * @param error - what the geometry threw
 */
function cutRefused(
  kept: Kept,
  last: ReadonlyMap<string, MadePair>,
  pair: MadePair,
  error: unknown
): void {
  const key = `${pair.a.polity}\u0000${pair.b.polity}`
  kept.cuts.set(key, pair)
  const before = last.get(key)
  if (before?.a === pair.a && before.b === pair.b) return
  kept.refused.push({ a: pair.a.polity, b: pair.b.polity })
  kept.log(
    `[Cartographer] the overlap of "${pair.a.polity}" and "${pair.b.polity}" could not be cut against the others, so it is not hatched: ${reasonOf(error)}`
  )
}

/**
 * Open a cache.
 * @param toBackdrop - a longitude and a latitude to backdrop pixels
 * @param log - where a refusal is said — `console.error` in the application
 * @returns the cache
 */
export function createOverlapCache(
  toBackdrop: (lonLat: readonly [number, number]) => Point,
  log: (message: string) => void
): OverlapCache {
  let answer: OverlapAnswer | null = null
  let at = Number.NaN
  const kept: Kept = { shapes: new Map(), pairs: new Map(), log, refused: [], cuts: new Map() }
  return {
    overlapsOf(document, version) {
      if (answer !== null && version === at) return answer
      kept.refused = []
      const pieces = overlapsAt(kept, document).map(({ polities, area }) => ({
        polities,
        rings: area.flatMap((polygon) =>
          polygon.map((ring) => ring.map((point) => toBackdrop(point)))
        ),
      }))
      answer = { pieces, refused: kept.refused }
      at = version
      return answer
    },
  }
}
