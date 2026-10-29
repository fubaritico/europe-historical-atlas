// The cities of a year, side by side in three open sources — one row a city, one column a source, never averaged.
//
// Run from the repository root, under Node 24:
//   node files/spikes/city-sources/merge.mjs [year]        (1100 by default)
//
// The three tables are fetched once into out/ (git-ignored); the result is out/cities-<year>.csv and a summary on stderr.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, 'out')
const YEAR = Number(process.argv[2] ?? 1100)

/** How close two records must lie to be one city by position alone, in kilometres — a village 7 km away is another place. */
const SAME_CITY_KM = 15

/** How far apart two records of the same name may lie and still be one city — the sources place some cities 30 km apart. */
const SAME_NAME_KM = 50

/** Bosker's step between two figures of a city: it estimates once a century. */
const BOSKER_STEP_YEARS = 100

/**
 * How close, in thousands, a Bosker figure must lie to the middle of its two neighbouring centuries to be marked as
 * most likely interpolated (`~`): half a thousand, under the rounding of its figures.
 */
const BETWEEN_TOLERANCE_THOUSANDS = 0.5

/** The Earth's mean radius, in kilometres, for the great-circle distance. */
const EARTH_RADIUS_KM = 6371

/** The map's extent, from packages/atlas/public/years/index.json. */
const INDEX = JSON.parse(readFileSync(join(HERE, '../../../packages/atlas/public/years/index.json'), 'utf8'))
const BBOX = INDEX.bbox

/** The three sources: where each is published, and its licence. */
const SOURCES = {
  bosker: {
    url: 'https://dataverse.harvard.edu/api/access/datafile/2458115',
    file: 'bosker-2013.tsv',
    cite: 'Bosker, Buringh & van Zanden (2013), From Baghdad to London — doi:10.7910/DVN/24747, CC0',
  },
  buringh: {
    url: 'https://ssh.datastations.nl/api/access/datafile/20415',
    file: 'buringh-2021.tsv',
    cite: 'Buringh (2021), European urban population, 700–2000 — doi:10.17026/DANS-XZY-U62Q, CC0',
  },
  chandler: {
    url: 'https://ndownloader.figshare.com/files/5407640',
    file: 'chandler-v2.csv',
    cite: 'Reba, Reitsma & Seto (2016), after Chandler (1987) — figshare 2059494, CC BY 4.0',
  },
}

/**
 * Fetch a source into out/ unless it is already there.
 * @param {{url: string, file: string}} source - where it is published and where it is kept
 * @returns {Promise<string>} its text
 */
async function load(source) {
  const path = join(OUT, source.file)
  if (!existsSync(path)) {
    const response = await fetch(source.url)
    if (!response.ok) throw new Error(`${source.url} answered ${response.status}`)
    writeFileSync(path, await response.text())
  }
  return readFileSync(path, 'utf8')
}

/**
 * Split a delimited text into records keyed by its header — quotes honoured, as the three tables quote names with commas.
 * @param {string} text - the table
 * @param {string} separator - `,` or a tab
 * @returns {Record<string, string>[]} one object a line
 */
function parse(text, separator) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === separator) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field !== '' || row.length > 0) rows.push([...row, field])
  const [header, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(header.map((h, k) => [h.trim(), r[k] ?? ''])))
}

/**
 * A number from a source's cell: a decimal comma read as a point; empty, `NA` or nought read as no figure.
 * @param {string | undefined} cell - the cell
 * @returns {number | null} the number, or `null`
 */
function figure(cell) {
  if (cell === undefined) return null
  const n = Number(cell.replace(',', '.'))
  return cell.trim() === '' || !Number.isFinite(n) || n === 0 ? null : n
}

/**
 * Whether a position lies on the map.
 * @param {number} lat - latitude
 * @param {number} lon - longitude
 * @returns {boolean} inside the year's extent
 */
function onMap(lat, lon) {
  return lat >= BBOX.south && lat <= BBOX.north && lon >= BBOX.west && lon <= BBOX.east
}

/**
 * Great-circle distance.
 * @param {{lat: number, lon: number}} a - one point
 * @param {{lat: number, lon: number}} b - another
 * @returns {number} kilometres
 */
function km(a, b) {
  const rad = Math.PI / 180
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** A name without its alternatives: « Constantinople (Istanbul, Byzantium…) » → « Constantinople ». */
const shortName = (name) => name.replace(/\s*\(.*$/, '').trim()

/**
 * Every name a record goes by, folded for comparison: no accents, no case, letters only.
 * @param {...string} names - its name and its alternatives, each possibly a list in brackets or after commas
 * @returns {Set<string>} the folded names
 */
function namesOf(...names) {
  const fold = (s) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '')
  return new Set(
    names
      .flatMap((n) => (n ?? '').split(/[(),~;]/))
      .map(fold)
      .filter((n) => n.length > 2),
  )
}

mkdirSync(OUT, { recursive: true })
const [boskerText, buringhText, chandlerText] = await Promise.all([
  load(SOURCES.bosker),
  load(SOURCES.buringh),
  load(SOURCES.chandler),
])

// Bosker: one row a city and a century, populations in thousands, with the cities' roles.
const boskerRows = parse(boskerText, '\t')
const boskerAt = (city, year) => boskerRows.find((r) => r.city === city && Number(r.year) === year)
const bosker = boskerRows
  .filter((r) => Number(r.year) === YEAR)
  .map((r) => {
    const before = figure(boskerAt(r.city, YEAR - BOSKER_STEP_YEARS)?.citypop_le10)
    const after = figure(boskerAt(r.city, YEAR + BOSKER_STEP_YEARS)?.citypop_le10)
    const pop = figure(r.citypop_le10)
    return {
      name: shortName(r.city),
      names: namesOf(r.city),
      lat: Number(r.latitude),
      lon: Number(r.longitude),
      pop,
      // A figure exactly between the centuries around it is most likely interpolated, not an estimate of its own.
      between: pop !== null && before !== null && after !== null && Math.abs(pop - (before + after) / 2) < BETWEEN_TOLERANCE_THOUSANDS,
      roles: [
        r.capital === '1' && 'capital',
        r.archbishop === '1' && 'archbishop',
        r.bishop === '1' && 'bishop',
        r.muslim_holy_city === '1' && 'muslim holy city',
        r.university === '1' && 'university',
      ].filter(Boolean),
    }
  })
  .filter((c) => c.pop !== null && onMap(c.lat, c.lon))

// Buringh: one row a city and a year, thousands, and the nature of each estimate.
const buringh = parse(buringhText, '\t')
  .filter((r) => figure(r.year) === YEAR)
  .map((r) => ({
    name: r.city,
    names: namesOf(r.city, r.synonymsandhistoricalnames),
    lat: figure(r.latitudeindegrees),
    lon: figure(r.longitudeindegrees),
    pop: figure(r['inhabitantsin000-s']),
    nature: r.natureofestimate,
    basis: r.source,
  }))
  .filter((c) => c.pop !== null && c.lat !== null && c.lon !== null && onMap(c.lat, c.lon))

// Chandler: one row a city, one column a year, in inhabitants — brought to thousands like the two others.
const chandler = parse(chandlerText, ',')
  .map((r) => ({
    name: r.City,
    names: namesOf(r.City, r.OtherName),
    lat: Number(r.Latitude),
    lon: Number(r.Longitude),
    pop: figure(r[`AD_${YEAR}`]) === null ? null : figure(r[`AD_${YEAR}`]) / 1000,
    certainty: r.Certainty,
  }))
  .filter((c) => c.pop !== null && onMap(c.lat, c.lon))

// One city a cluster of records, Bosker first (it covers the widest ground), each source once in a city. Two passes a
// source: by name within SAME_NAME_KM first, so a village nearby (Monreale, 7 km from Palermo) cannot take the city's
// place; then by position within SAME_CITY_KM for what no name joined; what is left is a city of its own.
const cities = []
const nearest = (candidates, record) => candidates.sort((a, b) => km(a, record) - km(b, record))[0]
for (const [key, records] of [
  ['bosker', bosker],
  ['buringh', buringh],
  ['chandler', chandler],
]) {
  const left = []
  for (const record of records) {
    const named = nearest(
      cities.filter(
        (c) => c[key] === undefined && km(c, record) <= SAME_NAME_KM && [...record.names].some((n) => c.names.has(n)),
      ),
      record,
    )
    if (named) {
      named[key] = record
      for (const n of record.names) named.names.add(n)
    } else left.push(record)
  }
  for (const record of left) {
    const near = nearest(
      cities.filter((c) => c[key] === undefined && km(c, record) <= SAME_CITY_KM),
      record,
    )
    if (near) {
      near[key] = record
      for (const n of record.names) near.names.add(n)
    } else cities.push({ name: record.name, names: new Set(record.names), lat: record.lat, lon: record.lon, [key]: record })
  }
}

const most = (c) => Math.max(c.bosker?.pop ?? 0, c.buringh?.pop ?? 0, c.chandler?.pop ?? 0)
cities.sort((a, b) => most(b) - most(a))

/**
 * How far the sources part, as the largest figure over the smallest — computed, never typed: agreement, not truth.
 * @param {object} c - a city
 * @returns {string} the ratio, or `—` with fewer than two figures
 */
function spread(c) {
  const pops = [c.bosker?.pop, c.buringh?.pop, c.chandler?.pop].filter((p) => p !== undefined)
  return pops.length < 2 ? '—' : (Math.max(...pops) / Math.min(...pops)).toFixed(2)
}

const quote = (s) => `"${String(s).replaceAll('"', '""')}"`
const lines = [
  'name,lat,lon,sources,spread,bosker,bosker_between,roles,buringh,buringh_nature,buringh_basis,chandler,chandler_certainty',
  ...cities.map((c) =>
    [
      quote(c.name),
      c.lat.toFixed(3),
      c.lon.toFixed(3),
      [c.bosker, c.buringh, c.chandler].filter(Boolean).length,
      spread(c),
      c.bosker?.pop ?? '',
      c.bosker ? c.bosker.between : '',
      quote(c.bosker?.roles.join(' ') ?? ''),
      c.buringh?.pop ?? '',
      quote(c.buringh?.nature ?? ''),
      quote(c.buringh?.basis ?? ''),
      c.chandler?.pop ?? '',
      quote(c.chandler?.certainty ?? ''),
    ].join(','),
  ),
]
writeFileSync(join(OUT, `cities-${YEAR}.csv`), `${lines.join('\n')}\n`)

console.warn(`${YEAR}: ${cities.length} cities on the map — Bosker ${bosker.length}, Buringh ${buringh.length}, Chandler ${chandler.length}`)
console.warn(`in all three: ${cities.filter((c) => c.bosker && c.buringh && c.chandler).length}`)
for (const c of cities.slice(0, 60)) {
  const cell = (s, extra = '') => (s ? `${s.pop}${extra}` : '·').padStart(8)
  console.warn(
    `${c.name.slice(0, 22).padEnd(22)} ${cell(c.bosker, c.bosker?.between ? '~' : '')} ${cell(c.buringh)} ${cell(c.chandler)}  ×${spread(c).padEnd(5)} ${c.bosker?.roles.join(', ') ?? ''}`,
  )
}
