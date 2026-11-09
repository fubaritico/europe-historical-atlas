import { meanPoint, ringAreaKm2 } from './lint.mjs'

/**
 * The overlaps of a map, as the Cartographer hatches them — computed by `core/data/overlaps.ts` itself, so the measure
 * and the screen agree piece for piece. The dev, 2026-11-09: several polities mixed or overlapping in one zone, the zone
 * is erased and redrawn whole (`references/decide.md`); this names the zones.
 *
 * The functions of `core` are handed in (the command imports them under `tsx`, the tests hand stand-ins), so this file
 * stays plain JavaScript under `node --test`.
 */

/**
 * @typedef {import('./geo.mjs').LonLat} LonLat
 * @typedef {import('./yearMap.mjs').YearMap} YearMap
 * @typedef {number[][][][]} MultiPolygon
 * @typedef {{ polity: string, shape: MultiPolygon, box: readonly number[] }} PolityShape
 * @typedef {{ polities: readonly string[], area: MultiPolygon }} Overlap
 */

/**
 * The four functions of `core/data/overlaps.ts` this measure calls.
 * @typedef {object} OverlapApi
 * @property {(document: object, polity: string) => PolityShape | null} polityShape - a polity's ground; throws on a
 *   degenerate ring
 * @property {(document: object, shapes: PolityShape[]) => [PolityShape, PolityShape][]} overlapCandidates - the pairs
 *   worth intersecting, vassalage left out
 * @property {(a: PolityShape, b: PolityShape) => MultiPolygon} pairOverlap - the ground two share; throws on refusal
 * @property {(document: object, pieces: Overlap[], next: Overlap) => Overlap[]} addOverlap - cuts a new overlap into
 *   the pieces
 */

/**
 * A multipolygon's area: each polygon's outer ring less its holes.
 * @param {MultiPolygon} area - the ground
 * @returns {number} square kilometres
 */
export function multiPolygonKm2(area) {
  return area.reduce(
    (sum, polygon) =>
      sum +
      polygon.reduce(
        (inner, ring, k) => inner + (k === 0 ? 1 : -1) * ringAreaKm2(/** @type {LonLat[]} */ (ring)),
        0
      ),
    0
  )
}

/**
 * Every zone two polities or more cover. A polity or a pair the geometry refuses is skipped and listed — the
 * Cartographer's own answer (the dev, 2026-11-06: skip the pair and say so).
 * @param {YearMap} map - the map
 * @param {OverlapApi} api - the functions of `core`
 * @returns {{ zones: { polities: readonly string[], km2: number, at: LonLat }[], refused: string[] }} the zones,
 *   largest first, each with the mean point of its largest piece's outline; and every refusal, said in one line
 */
export function overlapZones(map, api) {
  const document = { anchors: map.anchors, claims: map.claims, polities: map.registry }
  /** @type {string[]} */
  const refused = []
  /** @type {PolityShape[]} */
  const shapes = []
  for (const id of new Set(map.claims.map((claim) => claim.polity))) {
    try {
      const shape = api.polityShape(document, id)
      if (shape !== null) shapes.push(shape)
    } catch (error) {
      refused.push(`${id}: its ground is refused by the geometry — ${String(error)}`)
    }
  }
  /** @type {Overlap[]} */
  let pieces = []
  for (const [a, b] of api.overlapCandidates(document, shapes)) {
    try {
      const area = api.pairOverlap(a, b)
      if (area.length > 0) pieces = api.addOverlap(document, pieces, { polities: [a.polity, b.polity], area })
    } catch (error) {
      refused.push(`${a.polity} × ${b.polity}: refused by the geometry — ${String(error)}`)
    }
  }
  const zones = pieces.map((piece) => {
    const largest = [...piece.area].sort(
      (p, q) => ringAreaKm2(/** @type {LonLat[]} */ (q[0])) - ringAreaKm2(/** @type {LonLat[]} */ (p[0]))
    )[0]
    return {
      polities: piece.polities,
      km2: multiPolygonKm2(piece.area),
      at: meanPoint(/** @type {LonLat[]} */ (largest[0])),
    }
  })
  return { zones: zones.sort((p, q) => q.km2 - p.km2), refused }
}
