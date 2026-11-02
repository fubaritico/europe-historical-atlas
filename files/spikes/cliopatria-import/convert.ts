/**
 * Turn Cliopatria's polities of one year into a Cartographer snapshot, so the dev can open it with « Open snapshot »,
 * look at it over the atlas's backdrop and retouch it — without his own year on disk being touched.
 *
 * Asked by the dev on 2026-11-02 (« il faut qu'on arrive à importer du Cliopatria, et qu'on puisse le retoucher »).
 * Cliopatria: https://github.com/Seshat-Global-History-Databank/cliopatria — CC BY 4.0 — fetched with
 * `npx opensrc@0.6 Seshat-Global-History-Databank/cliopatria`, then its `cliopatria.geojson.zip` unzipped anywhere.
 *
 * Run from the repository root:
 *   packages/core/node_modules/.bin/tsx files/spikes/cliopatria-import/convert.ts <cliopatria.geojson> [year]
 *
 * What it does, and what it does not:
 * - every polity row alive at the year, inside the atlas's bounding box (`years/index.json`), becomes a polity;
 *   the grouping rows « (Kingdom of France) » and the RELATION rows are not drawn — they give the suzerains;
 * - points equal to 1e-6° are merged into one anchor, so a border both neighbours share in Cliopatria is shared here;
 *   the rest of the borders stay two tracings that the dev retouches;
 * - outer rings only — Cliopatria's holes are dropped (an enclave shows as its holder's);
 * - the coasts are Cliopatria's, coarse; nothing is snapped to the land mask yet.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  yearBordersSchema,
  yearPolitiesSchema,
  yearRegistrySchema,
} from '../../../packages/core/src/data/yearFormat'

import type {
  YearBorders,
  YearClaim,
  YearPolities,
  YearPolity,
  YearRegistry,
} from '../../../packages/core/src/data/yearFormat'

/** The repository's root, from this file. */
const ROOT = resolve(import.meta.dirname, '../../..')

/** Where the Cartographer keeps its hourly snapshots (git-ignored). */
const SNAPSHOTS = resolve(ROOT, 'packages/cartographer/.autosave/snapshots')

/** One Cliopatria row's properties, as its README describes them. */
interface CliopatriaProperties {
  Name: string
  FromYear: number
  ToYear: number
  Type: string
  Wikidata: string | null
  MemberOf: string | null
  Components: string | null
}

/** A GeoJSON geometry of a polity. */
interface Geometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

/** One Cliopatria row. */
interface Feature {
  properties: CliopatriaProperties
  geometry: Geometry | null
}

/** The atlas's bounding box, from `years/index.json`. */
interface Bbox {
  west: number
  south: number
  east: number
  north: number
}

/** The first word of a name, to the Cartographer's rank vocabulary (read from `years/1100/registry.json`). */
const RANKS: Readonly<Record<string, string>> = {
  kingdom: 'kingdom',
  duchy: 'duchy',
  county: 'county',
  principality: 'principality',
  empire: 'empire',
  republic: 'republic',
  sultanate: 'sultanate',
  caliphate: 'caliphate',
  emirate: 'emirate',
  taifa: 'kingdom',
  march: 'march',
  lordship: 'lordship',
  papal: 'state',
  giudicato: 'kingdom',
}

/**
 * A polity's rank, from its name's first word.
 * @param name - the polity's name
 * @returns the rank, or `null` when the name says none
 */
function rankOf(name: string): string | null {
  const word = name.replace(/^(old|great|grand|norman|armenian)\s+/i, '').split(/\s+/)[0]?.toLowerCase() ?? ''
  return RANKS[word] ?? null
}

/**
 * An id the Cartographer accepts: lower case, words joined by dashes.
 * @param name - the polity's name
 * @returns the id
 */
function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * A stable colour per name, so two runs paint the same polity alike.
 * @param name - the polity's name
 * @returns a `#rrggbb` colour
 */
function colourOf(name: string): string {
  let hash = 0
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  const hue = hash % 360
  const s = 0.45
  const l = 0.55
  const k = (n: number): number => (n + hue / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const hex = (x: number): string =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`
}

/**
 * Every outer ring of a geometry.
 * @param geometry - a Polygon or a MultiPolygon
 * @returns the outer rings, each a list of `[lon, lat]`
 */
function outerRings(geometry: Geometry): number[][][] {
  if (geometry.type === 'Polygon') {
    const ring = (geometry.coordinates as number[][][])[0]
    return ring === undefined ? [] : [ring]
  }
  return (geometry.coordinates as number[][][][]).flatMap((polygon) => (polygon[0] === undefined ? [] : [polygon[0]]))
}

/**
 * Whether a ring touches the box.
 * @param ring - `[lon, lat]` points
 * @param box - the atlas's bounding box
 * @returns `true` when the ring's bounds meet the box
 */
function touches(ring: number[][], box: Bbox): boolean {
  const xs = ring.map((point) => point[0] ?? 0)
  const ys = ring.map((point) => point[1] ?? 0)
  return Math.max(...xs) >= box.west && Math.min(...xs) <= box.east && Math.max(...ys) >= box.south && Math.min(...ys) <= box.north
}

const [, , input, yearArgument] = process.argv
if (input === undefined) {
  console.error('usage: convert.ts <cliopatria.geojson> [year]')
  process.exit(1)
}
const YEAR = Number(yearArgument ?? '1100')
const box = (JSON.parse(readFileSync(resolve(ROOT, 'packages/atlas/public/years/index.json'), 'utf8')) as { bbox: Bbox })
  .bbox
const features = (JSON.parse(readFileSync(input, 'utf8')) as { features: Feature[] }).features

const alive = features.filter(
  (feature) => feature.geometry !== null && feature.properties.FromYear <= YEAR && YEAR <= feature.properties.ToYear
)
const drawn = alive.filter(
  (feature) =>
    feature.properties.Type === 'POLITY' &&
    !feature.properties.Name.startsWith('(') &&
    feature.geometry !== null &&
    outerRings(feature.geometry).some((ring) => touches(ring, box))
)

// The suzerains: a group « (X) » whose components include a polity named « X » makes X the suzerain of the others.
const names = new Set(drawn.map((feature) => feature.properties.Name))
const suzerainOf = new Map<string, string>()
for (const feature of drawn) {
  const group = feature.properties.MemberOf
  if (group === null || group === '' || !group.startsWith('(')) continue
  const head = group.slice(1, -1)
  if (head !== feature.properties.Name && names.has(head)) suzerainOf.set(feature.properties.Name, head)
}

const anchors: [number, number][] = []
const anchorIndex = new Map<string, number>()
/**
 * The anchor of a point, created on first sight — two polities naming the same point share it.
 * @param lon - longitude
 * @param lat - latitude
 * @returns the anchor's index
 */
function anchorOf(lon: number, lat: number): number {
  const key = `${lon.toFixed(6)},${lat.toFixed(6)}`
  const known = anchorIndex.get(key)
  if (known !== undefined) return known
  anchors.push([Number(lon.toFixed(6)), Number(lat.toFixed(6))])
  anchorIndex.set(key, anchors.length - 1)
  return anchors.length - 1
}

const polities: YearPolity[] = []
const claims: YearClaim[] = []
const usedIds = new Set<string>()
let droppedRings = 0
for (const feature of drawn) {
  const { Name, Wikidata } = feature.properties
  let id = slug(Name)
  while (usedIds.has(id)) id = `${id}-2`
  usedIds.add(id)
  const rings: number[][] = []
  for (const ring of outerRings(feature.geometry as Geometry)) {
    const indices: number[] = []
    for (const point of ring) {
      const index = anchorOf(point[0] ?? 0, point[1] ?? 0)
      if (indices[indices.length - 1] !== index) indices.push(index)
    }
    if (indices.length > 1 && indices[0] === indices[indices.length - 1]) indices.pop()
    if (new Set(indices).size >= 3) rings.push(indices)
    else droppedRings += 1
  }
  if (rings.length === 0) continue
  polities.push({
    id,
    name: Name,
    rank: rankOf(Name),
    status: 'country',
    suzerain: null,
    existsFrom: null,
    existsTo: null,
    colour: colourOf(Name),
    wikidata: Wikidata !== null && /^Q\d+$/.test(Wikidata) ? Wikidata : null,
  })
  claims.push({ polity: id, rings })
}
const idOfName = new Map(polities.map((polity) => [polity.name, polity.id]))
const byId = new Map(polities.map((polity) => [polity.id, polity]))
const byWikidata = new Map(
  polities.filter((polity) => polity.wikidata !== null).map((polity) => [polity.wikidata as string, polity.id])
)
/** Where each suzerain link came from, for the report. */
const linkSource = new Map<string, string>()

/**
 * Whether making `lord` the suzerain of `vassal` would close a loop of homage.
 * @param vassal - the polity to be bound
 * @param lord - its would-be suzerain
 * @returns `true` when `lord` already depends, at any depth, on `vassal`
 */
function wouldLoop(vassal: string, lord: string): boolean {
  let cursor: string | null = lord
  const seen = new Set<string>()
  while (cursor !== null && !seen.has(cursor)) {
    if (cursor === vassal) return true
    seen.add(cursor)
    cursor = byId.get(cursor)?.suzerain ?? null
  }
  return false
}

/**
 * Bind a vassal to its lord, unless it has one already or the link would loop.
 * @param vassal - the vassal's id
 * @param lord - the suzerain's id
 * @param source - which source says so
 */
function bind(vassal: string, lord: string | undefined, source: string): void {
  const polity = byId.get(vassal)
  if (polity === undefined || lord === undefined || lord === vassal || polity.suzerain !== null) return
  if (wouldLoop(vassal, lord)) return
  polity.suzerain = lord
  linkSource.set(vassal, source)
}

// 1. Cliopatria's own groups.
for (const polity of polities) bind(polity.id, idOfName.get(suzerainOf.get(polity.name) ?? ''), 'Cliopatria')

// 1b. The stacking, when the input went through resolve.py: an older drawing a newer one lay inside.
for (const feature of drawn) {
  const hint = (feature.properties as CliopatriaProperties & { SuzerainHint?: string }).SuzerainHint
  const vassal = idOfName.get(feature.properties.Name)
  if (hint !== undefined && vassal !== undefined) bind(vassal, idOfName.get(hint), 'geometry')
}

// 2. The dev's own year, as committed (the file on disk may hold this very import, saved to look at it): his links of
// homage, matched by Wikidata id, then by name. Facts only — no geometry.
/**
 * The dev's committed year, when there is one.
 * @returns its registry, or one with no polity — said on the console — when he never drew that year
 */
function committedYear(): YearRegistry {
  try {
    return JSON.parse(
      execFileSync('git', ['-C', ROOT, 'show', `HEAD:packages/atlas/public/years/${String(YEAR)}/registry.json`], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
    ) as YearRegistry
  } catch {
    console.warn(`no committed year ${String(YEAR)} of the dev's: no link of homage taken from it`)
    return { version: 1, year: YEAR, polities: [] }
  }
}
const ownYear = committedYear()
const ownById = new Map(ownYear.polities.map((polity) => [polity.id, polity]))
/** The dev's names whose Cliopatria name differs beyond its rank word — read side by side on 2026-11-02. */
const ALIASES: Readonly<Record<string, string>> = {
  'Kingdom of England': 'Norman England',
  'Kingdom of Scotland': 'Kingdom of Alba',
  'Kingdom of Norway': 'Old Kingdom of Norway',
  'Seljuk Empire': 'Great Seljuk Empire',
  'Seljuk Sultanate of Rûm': 'Sultanate of Rum',
  'Kingdom of León and Castile': 'Kingdom of Castile',
  'Kingdom of Aragon and Navarre': 'Kingdom of Aragon',
  'Republic of Novgorod': 'Novgorod Republic',
  'Principality of Polotsk': 'Principality of Polotsky',
  'Principality of the Kievan Rus': 'Principality of Kiev',
  'Duchy of Apulia and Calabria': 'Norman Italy',
  'State of the Church': 'Papal States',
  'Kingdom of Raška': 'Grand Principality of Serbia',
}
const normal = (name: string): string =>
  slug(ALIASES[name] ?? name).replace(/^(the-|old-|great-|grand-|kingdom-of-|duchy-of-|county-of-|principality-of-)+/, '')
const cliopatriaByNormal = new Map(polities.map((polity) => [normal(polity.name), polity.id]))
/**
 * The imported polity that stands for one of the dev's.
 * @param own - one of the dev's polities
 * @returns the imported id, or `undefined`
 */
function matchOwn(own: YearPolity): string | undefined {
  if (own.wikidata !== null && byWikidata.has(own.wikidata)) return byWikidata.get(own.wikidata)
  return cliopatriaByNormal.get(normal(own.name))
}
for (const own of ownYear.polities) {
  if (own.suzerain === null) continue
  const lord = ownById.get(own.suzerain)
  if (lord === undefined) continue
  const vassal = matchOwn(own)
  if (vassal !== undefined) bind(vassal, matchOwn(lord), "the dev's year")
}

// 3. Wikidata: « part of », « country », « located in », dated or not, pointing at another imported polity.
const qids = [...byWikidata.keys()]
const sparql = `SELECT ?item ?target ?start ?end WHERE {
  VALUES ?item { ${qids.map((qid) => `wd:${qid}`).join(' ')} }
  VALUES (?p ?ps) { (p:P361 ps:P361) (p:P17 ps:P17) (p:P131 ps:P131) }
  ?item ?p ?statement . ?statement ?ps ?target .
  OPTIONAL { ?statement pq:P580 ?start } OPTIONAL { ?statement pq:P582 ?end }
}`
try {
  const response = await fetch(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`, {
    headers: { 'User-Agent': 'europe-historical-atlas spike (cliopatria-import)' },
  })
  const answer = (await response.json()) as {
    results: { bindings: { item: { value: string }; target: { value: string }; start?: { value: string }; end?: { value: string } }[] }
  }
  const yearOf = (value: string | undefined): number | null => (value === undefined ? null : Number.parseInt(value.replace(/^\+/, ''), 10))
  for (const row of answer.results.bindings) {
    const item = row.item.value.split('/').pop() ?? ''
    const target = row.target.value.split('/').pop() ?? ''
    const start = yearOf(row.start?.value)
    const end = yearOf(row.end?.value)
    if ((start !== null && start > YEAR) || (end !== null && end < YEAR)) continue
    bind(byWikidata.get(item) ?? '', byWikidata.get(target), 'Wikidata')
  }
} catch (error: unknown) {
  console.error('Wikidata could not be asked — the links it would give are missing from this run', error)
}

// 4. The geometry: a polity drawn mostly (≥ 80 %) inside another is its vassal — Cliopatria's principalities under
// Kievan Rus'. Sampled on the inner polity's points, by ray casting.
/**
 * Whether a point lies inside a ring.
 * @param point - `[lon, lat]`
 * @param ring - anchor indices
 * @returns `true` when inside
 */
function inside(point: [number, number], ring: number[]): boolean {
  const [x, y] = point
  let hit = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = anchors[ring[i] ?? 0] ?? [0, 0]
    const [xj, yj] = anchors[ring[j] ?? 0] ?? [0, 0]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
for (const inner of claims) {
  const samples = inner.rings.flatMap((ring) => ring.filter((_, k) => k % Math.max(1, Math.floor(ring.length / 25)) === 0))
  let best: { lord: string; share: number } | null = null
  for (const outer of claims) {
    if (outer.polity === inner.polity) continue
    const within = samples.filter((index) => outer.rings.some((ring) => inside(anchors[index] ?? [0, 0], ring))).length
    const share = within / samples.length
    if (share >= 0.8 && (best === null || share > best.share)) best = { lord: outer.polity, share }
  }
  if (best !== null) bind(inner.polity, best.lord, 'geometry')
}

const registry: YearRegistry = yearRegistrySchema.parse({ version: 1, year: YEAR, polities })
const politiesFile: YearPolities = yearPolitiesSchema.parse({
  version: 1,
  year: YEAR,
  sources: [
    {
      id: 0,
      name: 'Cliopatria, Seshat Global History Databank (github.com/Seshat-Global-History-Databank/cliopatria)',
      licence: 'CC BY 4.0',
    },
  ],
  anchors,
  anchorSource: anchors.map(() => 0),
  claims,
  deliberateGaps: [],
})
const borders: YearBorders = yearBordersSchema.parse({ version: 1, year: YEAR, pairs: [], runs: [] })

const shared = new Map<number, number>()
for (const claim of claims) for (const ring of claim.rings) for (const index of new Set(ring)) shared.set(index, (shared.get(index) ?? 0) + 1)
const sharedCount = [...shared.values()].filter((owners) => owners > 1).length

const savedAt = new Date()
const stamp = savedAt.toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/:/g, '-')
const out = resolve(SNAPSHOTS, `${String(YEAR)}.${stamp}.json`)
writeFileSync(out, JSON.stringify({ year: YEAR, savedAt: savedAt.toISOString(), files: { registry, polities: politiesFile, borders } }))
console.warn(
  [
    `polities: ${String(polities.length)} (of ${String(alive.length)} rows alive in ${String(YEAR)})`,
    `with a suzerain: ${String(polities.filter((polity) => polity.suzerain !== null).length)} — ${['Cliopatria', "the dev's year", 'Wikidata', 'geometry'].map((source) => `${source} ${String([...linkSource.values()].filter((s) => s === source).length)}`).join(', ')}`,
    ...polities
      .filter((polity) => polity.suzerain !== null)
      .map((polity) => `  ${polity.name} → ${byId.get(polity.suzerain ?? '')?.name ?? '?'} (${linkSource.get(polity.id) ?? '?'})`),
    `with a Wikidata id: ${String(polities.filter((polity) => polity.wikidata !== null).length)}`,
    `anchors: ${String(anchors.length)}, shared by two polities or more: ${String(sharedCount)}`,
    `rings dropped (fewer than 3 points): ${String(droppedRings)}`,
    `written: ${out}`,
  ].join('\n')
)
