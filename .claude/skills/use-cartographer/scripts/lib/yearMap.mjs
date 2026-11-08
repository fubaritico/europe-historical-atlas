import { insideRing } from './geo.mjs'

/**
 * A map of `years/` as the measures need it — read once, then queried by pure functions.
 *
 * The files are the Cartographer's own (`polities.json`: an anchor table and rings of indices; `registry.json`: the
 * polities' identities). Nothing here writes: a map is changed in the Cartographer, never by a script (the skill's
 * first rule).
 */

/**
 * @typedef {import('./geo.mjs').LonLat} LonLat
 * @typedef {{ polity: string, rings: number[][] }} Claim
 * @typedef {{ id: string, name: string, wikidata?: string | null, existsFrom?: number | null,
 *   existsTo?: number | null }} RegistryPolity
 */

/**
 * A year's map, loaded.
 * @typedef {object} YearMap
 * @property {number} year - the year the folder draws
 * @property {LonLat[]} anchors - every anchor, by index
 * @property {Claim[]} claims - each polity's rings, as lists of anchor indices
 * @property {Map<string, string>} polityByQid - the registry's Wikidata ids, to the polity ids of the map
 * @property {RegistryPolity[]} registry - the registry's polities, as written
 */

/**
 * Build a map from the two files' contents.
 * @param {{ year: number, anchors: LonLat[], claims: Claim[] }} polities - `polities.json`, parsed
 * @param {{ polities: RegistryPolity[] }} registry - `registry.json`, parsed
 * @returns {YearMap} the map
 */
export function yearMapFrom(polities, registry) {
  const polityByQid = new Map()
  for (const polity of registry.polities) {
    if (polity.wikidata) polityByQid.set(polity.wikidata, polity.id)
  }
  return {
    year: polities.year,
    anchors: polities.anchors,
    claims: polities.claims,
    polityByQid,
    registry: registry.polities,
  }
}

/**
 * Read a year folder.
 * @param {string} folder - the folder of `years/`, e.g. `packages/atlas/public/years/1100`
 * @param {(path: string) => unknown} readJson - reads and parses a file; it throws when the file is missing
 * @returns {YearMap} the map
 */
export function readYearMap(folder, readJson) {
  return yearMapFrom(
    /** @type {never} */ (readJson(`${folder}/polities.json`)),
    /** @type {never} */ (readJson(`${folder}/registry.json`))
  )
}

/**
 * A ring's points.
 * @param {YearMap} map - the map
 * @param {readonly number[]} ring - anchor indices
 * @returns {LonLat[]} the points, in ring order
 */
export function ringPoints(map, ring) {
  return ring.map((index) => map.anchors[index])
}

/**
 * Every polity holding a point — even-odd over each polity's rings, so a hole carved by a vassal is out.
 * @param {YearMap} map - the map
 * @param {LonLat} point - the point
 * @returns {string[]} polity ids; empty on the sea or on ground nobody claims
 */
export function holdersAt(map, point) {
  return map.claims
    .filter(
      (claim) =>
        claim.rings.filter((ring) => insideRing(point, ringPoints(map, ring))).length % 2 === 1
    )
    .map((claim) => claim.polity)
}

/**
 * The key of an undirected segment between two anchors.
 * @param {number} a - one anchor
 * @param {number} b - the other
 * @returns {string} the same key whatever the order
 */
export function segmentKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/**
 * Who holds each segment — a border is a segment held by two polities.
 * @param {YearMap} map - the map
 * @returns {Map<string, Set<string>>} segment key to the polities whose rings run along it
 */
export function segmentOwners(map) {
  const owners = new Map()
  for (const claim of map.claims) {
    for (const ring of claim.rings) {
      ring.forEach((anchor, k) => {
        const key = segmentKey(anchor, ring[(k + 1) % ring.length])
        if (!owners.has(key)) owners.set(key, new Set())
        owners.get(key).add(claim.polity)
      })
    }
  }
  return owners
}

/**
 * Each consecutive vertex triple of every ring of a polity, or of every polity.
 * @param {YearMap} map - the map
 * @param {string | undefined} polity - one polity id, or every polity when omitted
 * @returns {{ polity: string, at: number, previous: number, next: number }[]} one entry per vertex
 */
export function ringVertices(map, polity) {
  return map.claims
    .filter((claim) => polity === undefined || claim.polity === polity)
    .flatMap((claim) =>
      claim.rings.flatMap((ring) =>
        ring.map((at, k) => ({
          polity: claim.polity,
          at,
          previous: ring[(k - 1 + ring.length) % ring.length],
          next: ring[(k + 1) % ring.length],
        }))
      )
    )
}
