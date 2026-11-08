/**
 * Where the polities' outlines overlap — the ground two of them or more cover (CARTO-364).
 *
 * The dev, 2026-11-06: *"if one entity's outline spills over another's, it makes a zone hatched in the colour of the
 * one and of the other"*; four polities one over the other, four hatchings — *"it will never happen, but it must be
 * computed that way"*. So the ground is cut into pieces, each with **every** polity covering it, however many.
 *
 * **A mechanism, not a statement**: an overlap is shown whether it is a slip of the hand or ground two powers held;
 * what it means is the author's to know. Declaring a disputed zone, with its source, is set aside on purpose (the
 * dev: *"restons simples"*). **One exception, which is not one**: a polity over one of its suzerains — at any
 * depth — is vassalage (`s02`, H-05a), never an overlap.
 *
 * The geometry is `polygon-clipping`'s (MIT, the clipping Turf uses), in longitude and latitude — the document's
 * own coordinates, so the atlas can read the same pieces one day. It can refuse a degenerate shape by throwing;
 * what to do then is the caller's (the Cartographer skips the pair and says so — the dev, 2026-11-06).
 */

import polygonClipping from 'polygon-clipping'

import type { YearDocument } from '../data/yearDocument'
import type { MultiPolygon, Polygon } from 'polygon-clipping'

/** A polity's ground, in longitude and latitude, with the box round it. */
export interface PolityShape {
  /** The polity's id. */
  polity: string
  /** Its ground: every ring of every claim it has, even-odd within a claim, the claims together. */
  shape: MultiPolygon
  /** The box round it: west, south, east, north. */
  box: readonly [number, number, number, number]
}

/** One piece of ground two polities or more cover. */
export interface Overlap {
  /** Every polity covering it, in the order their pairs were met; two at least. */
  polities: readonly string[]
  /** The piece, in longitude and latitude. */
  area: MultiPolygon
}

/**
 * A claim's ground: its rings, each closed by the line between its ends when it is open — as the fill is painted
 * (`open-outlines.md`) — and combined even-odd, so a ring inside another is a hole.
 * @param document - the document the claim is in
 * @param claim - the claim
 * @returns its ground; empty when no ring encloses anything
 */
function claimShape(document: YearDocument, claim: YearDocument['claims'][number]): MultiPolygon {
  const polygons: Polygon[] = []
  for (const ring of claim.rings) {
    const points = ring.flatMap((index) => {
      const point = document.anchors[index]
      return point === undefined ? [] : [point]
    })
    // Two points enclose nothing: an open line of two (`OPEN_RING_FLOOR`) has no ground to overlap. Not a refusal —
    // there is nothing to compute; a closed ring holds three by the document's own floor.
    if (points.length < 3) continue
    // An open outline needs nothing more: the clipping closes every ring by the line between its ends, as the fill is
    // painted (`open-outlines.md`).
    polygons.push([points])
  }
  const [first, ...rest] = polygons
  if (first === undefined) return []
  return polygonClipping.xor(first, ...rest)
}

/**
 * The box round a ground.
 * @param shape - the ground
 * @returns west, south, east, north
 */
function boxOf(shape: MultiPolygon): [number, number, number, number] {
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const polygon of shape) {
    for (const [x, y] of polygon[0] ?? []) {
      box[0] = Math.min(box[0], x)
      box[1] = Math.min(box[1], y)
      box[2] = Math.max(box[2], x)
      box[3] = Math.max(box[3], y)
    }
  }
  return box
}

/**
 * Each polity's ground, from its claims — a polity with two claims has them together.
 * @param document - the document to read
 * @param polity - the polity
 * @returns its shape; `null` when it encloses nothing
 * @throws when the geometry refuses a degenerate ring — the caller decides what that means
 */
export function polityShape(document: YearDocument, polity: string): PolityShape | null {
  const parts = document.claims
    .filter((claim) => claim.polity === polity)
    .map((claim) => claimShape(document, claim))
    .filter((part) => part.length > 0)
  const [first, ...rest] = parts
  if (first === undefined) return null
  const shape = rest.length === 0 ? first : polygonClipping.union(first, ...rest)
  return { polity, shape, box: boxOf(shape) }
}

/**
 * Every suzerain above a polity, at any depth. A loop in the registry is walked once round, never forever.
 * @param document - the document whose registry is read
 * @param polity - the polity
 * @returns the ids of its suzerains
 */
export function suzerainsOf(document: YearDocument, polity: string): Set<string> {
  const above = new Set<string>()
  let next = document.polities.find((each) => each.id === polity)?.suzerain ?? null
  while (next !== null && !above.has(next)) {
    above.add(next)
    const id: string = next
    next = document.polities.find((each) => each.id === id)?.suzerain ?? null
  }
  return above
}

/**
 * Whether two boxes share ground, edges included.
 * @param a - one box
 * @param b - the other
 * @returns `true` when they meet
 */
function boxesMeet(a: PolityShape['box'], b: PolityShape['box']): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]
}

/**
 * The pairs of polities worth intersecting: their boxes meet, and neither is the other's suzerain at any depth.
 * @param document - the document whose registry is read
 * @param shapes - every polity's shape
 * @returns the pairs, each in the order of `shapes`
 */
export function overlapCandidates(
  document: YearDocument,
  shapes: readonly PolityShape[]
): [PolityShape, PolityShape][] {
  const above = new Map(shapes.map((each) => [each.polity, suzerainsOf(document, each.polity)]))
  const pairs: [PolityShape, PolityShape][] = []
  for (const [i, a] of shapes.entries()) {
    for (const b of shapes.slice(i + 1)) {
      if (!boxesMeet(a.box, b.box)) continue
      if (
        above.get(a.polity)?.has(b.polity) === true ||
        above.get(b.polity)?.has(a.polity) === true
      )
        continue
      pairs.push([a, b])
    }
  }
  return pairs
}

/**
 * The ground two polities share.
 * @param a - one polity's shape
 * @param b - the other's
 * @returns what they share; empty when they only touch or not at all
 * @throws when the geometry refuses one of them
 */
export function pairOverlap(a: PolityShape, b: PolityShape): MultiPolygon {
  return polygonClipping.intersection(a.shape, b.shape)
}

/**
 * The polities of two pieces together, each once, without a suzerain of another of them — its vassal, painted over
 * it, is the more specific (`s02`, H-05a).
 * @param document - the document whose registry is read
 * @param a - one piece's polities
 * @param b - the other's
 * @returns the polities covering where both lie
 */
function together(
  document: YearDocument,
  a: readonly string[],
  b: readonly string[]
): readonly string[] {
  const all = [...new Set([...a, ...b])]
  const above = new Set(all.flatMap((polity) => [...suzerainsOf(document, polity)]))
  return all.filter((polity) => !above.has(polity))
}

/**
 * Add one overlap to the pieces already cut, cutting again where it falls on them: where it meets a piece, the
 * ground gets the polities of both — three polities over one ground come out as one piece of three.
 * @param document - the document whose registry is read
 * @param pieces - the pieces so far, none sharing ground with another
 * @param next - the overlap to add
 * @returns the pieces with it, still none sharing ground
 * @throws when the geometry refuses a cut — the caller decides what that means
 */
export function addOverlap(
  document: YearDocument,
  pieces: readonly Overlap[],
  next: Overlap
): Overlap[] {
  const out: Overlap[] = []
  let rest = next.area
  for (const piece of pieces) {
    const both = rest.length === 0 ? [] : polygonClipping.intersection(piece.area, rest)
    if (both.length === 0) {
      out.push(piece)
      continue
    }
    const only = polygonClipping.difference(piece.area, rest)
    if (only.length > 0) out.push({ polities: piece.polities, area: only })
    out.push({ polities: together(document, piece.polities, next.polities), area: both })
    rest = polygonClipping.difference(rest, piece.area)
  }
  if (rest.length > 0) out.push({ polities: next.polities, area: rest })
  return out
}
