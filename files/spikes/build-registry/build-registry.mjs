#!/usr/bin/env node
/**
 * Build the Cartographer's `registry.json` from the OHM relation catalogue the `fetch-ohm` spike already
 * cached, and **measure what is missing** — the registry is the file every year file refers to, and nothing
 * in the editor can open until it exists (`files/plans/cartographer/format.md`).
 *
 * THE QUESTION THIS SPIKE PROBES: an OHM relation is not a polity, it is *a polity during one period*. The
 * Kingdom of France appears several times. So the work is **grouping**, and the only real decision is the
 * key: the Wikidata id when there is one, the normalised name otherwise. Grouping by name can merge two
 * homonyms from different eras, so that is counted rather than assumed away.
 *
 * NOT A NETWORK JOB: it reads the cache only. Run `fetch-ohm.mjs --refresh` to renew that.
 *
 * On the licence: `fetch-ohm` drops features carrying a restrictive `license` tag because it takes their
 * *geometry*. This spike takes an **identity** — a kingdom's name, rank and dates are facts, which nobody
 * owns — so they are kept, and counted in the report.
 *
 * Usage:
 *   node files/spikes/build-registry/build-registry.mjs \
 *     [--cache files/spikes/fetch-ohm/out/relations.json] \
 *     [--out files/spikes/build-registry/out/registry.json]
 */

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/** A span longer than this, in years, makes a name-grouped polity a suspected bad merge. */
const SUSPECT_SPAN_YEARS = 200

/**
 * Parse `--key value` pairs from argv.
 * @param {string[]} argv - raw process arguments
 * @returns {Record<string, string>} the parsed flags
 */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const out = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) {
      out[key.slice(2)] = 'true'
      continue
    }
    out[key.slice(2)] = value
    i += 1
  }
  return out
}

/**
 * Read the leading year of an OSM-style date tag, tolerating `-0100`, `1500` and `1500-01-01`.
 * Mirrors `fetch-ohm` — spikes stay standalone rather than importing each other.
 * @param {string | undefined} value - the raw tag value
 * @returns {number | null} the year, negative for BCE, or `null` when unparseable
 */
function parseYear(value) {
  if (!value) return null
  const text = value.trim()
  const negative = text.startsWith('-')
  const match = /^(\d{1,6})/.exec(negative ? text.slice(1) : text)
  if (!match) return null
  const year = Number(match[1])
  return negative ? -year : year
}

/**
 * Fold a display name into a grouping key: lowercase, unaccented, punctuation and spacing collapsed.
 * @param {string} name - the display name
 * @returns {string} the folded key
 */
function foldName(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Propose a readable, stable id from a name. The dev corrects these by hand — the registry is an editorial
 * file, and `format.md` is explicit that an id is never a display name.
 * @param {string} name - the name to slug
 * @returns {string} the slug, `unnamed` when nothing survives
 */
function slugify(name) {
  const slug = foldName(name).replace(/ /g, '-')
  return slug.length > 0 ? slug : 'unnamed'
}

/**
 * Pick the value seen most often, so a polity whose relations disagree about its rank still gets one.
 * @param {(string | undefined)[]} values - the candidate values, undefined where the tag was absent
 * @returns {string | null} the most frequent value, or `null` when none was present
 */
function mostFrequent(values) {
  /** @type {Map<string, number>} */
  const counts = new Map()
  for (const value of values) {
    if (value === undefined || value === '') continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  let best = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best
}

const args = parseArgs(process.argv.slice(2))
const cachePath = args.cache ?? 'files/spikes/fetch-ohm/out/relations.json'
const outPath = args.out ?? 'files/spikes/build-registry/out/registry.json'

const cache = JSON.parse(readFileSync(cachePath, 'utf8'))
/** @type {{id: number, tags?: Record<string, string>}[]} */
const elements = cache.elements ?? []

const stats = {
  elements: elements.length,
  nameless: 0,
  restrictiveLicence: 0,
  groupedByQid: 0,
  groupedByName: 0,
  suspectMerges: 0,
  noRank: 0,
  noStatus: 0,
  noQid: 0,
  noFrenchName: 0,
  noStartDate: 0,
  endBeforeStart: 0,
  stillRunning: 0,
  slugCollisions: 0,
  multipleNames: 0,
}

/** @type {Map<string, {byQid: boolean, qid: string | null, members: Record<string, string>[]}>} */
const groups = new Map()

for (const element of elements) {
  const tags = element.tags
  if (!tags) continue
  const display = tags['name:en'] ?? tags.name
  if (display === undefined || display.trim() === '') {
    stats.nameless += 1
    continue
  }
  if (tags.license !== undefined && !/^(CC0|public[- ]?domain|PD)/i.test(tags.license)) {
    stats.restrictiveLicence += 1
  }
  const qid = /^Q\d+$/.test(tags.wikidata ?? '') ? tags.wikidata : null
  const key = qid ?? `name:${foldName(display)}`
  const group = groups.get(key)
  if (group) {
    group.members.push(tags)
    continue
  }
  groups.set(key, { byQid: qid !== null, qid: qid ?? null, members: [tags] })
}

/** @type {Set<string>} */
const takenIds = new Set()
/** @type {Record<string, unknown>[]} */
const polities = []

for (const [, group] of groups) {
  const { members } = group
  if (group.byQid) stats.groupedByQid += 1
  else stats.groupedByName += 1

  // One entry per distinct display name, dated by the earliest relation that carries it. This is what
  // `format.md`'s dated names are for: regnum Francorum → regnum Franciae, one polity throughout.
  /** @type {Map<string, {text: string, from: number | null, lang: string}>} */
  const frenchNames = new Map()
  /** @type {Map<string, {text: string, lang: string}>} */
  const aliases = new Map()
  let earliest = null
  let latest = null
  let openEnded = false

  for (const tags of members) {
    const start = parseYear(tags.start_date)
    const end = parseYear(tags.end_date)
    if (start === null) stats.noStartDate += 1
    if (start !== null && end !== null && end < start) stats.endBeforeStart += 1
    if (start !== null && (earliest === null || start < earliest)) earliest = start
    if (end === null) openEnded = true
    else if (latest === null || end > latest) latest = end

    const primary = tags['name:fr'] ?? tags['name:en'] ?? tags.name
    const lang = tags['name:fr'] !== undefined ? 'fr' : 'en'
    if (primary !== undefined && primary.trim() !== '') {
      const existing = frenchNames.get(primary)
      if (!existing || (start !== null && (existing.from === null || start < existing.from))) {
        frenchNames.set(primary, { text: primary, from: start, lang })
      }
    }
    for (const key of ['name', 'name:en', 'name:fr', 'name:la', 'name:de']) {
      const value = tags[key]
      if (value === undefined || value.trim() === '') continue
      if (frenchNames.has(value)) continue
      aliases.set(value, { text: value, lang: key.includes(':') ? key.slice(5) : 'en' })
    }
  }

  const names = [...frenchNames.values()].sort((a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity))
  if (names.length > 1) stats.multipleNames += 1
  if (openEnded) stats.stillRunning += 1

  const rank = mostFrequent(members.map((tags) => tags.border_type))
  const status = mostFrequent(members.map((tags) => tags.place))
  if (rank === null) stats.noRank += 1
  if (status === null) stats.noStatus += 1
  if (group.qid === null) stats.noQid += 1
  if (!members.some((tags) => tags['name:fr'] !== undefined)) stats.noFrenchName += 1

  const span = earliest !== null && latest !== null ? latest - earliest : 0
  if (!group.byQid && span > SUSPECT_SPAN_YEARS) stats.suspectMerges += 1

  const base = slugify(members[0]['name:en'] ?? members[0].name ?? 'unnamed')
  let id = base
  let suffix = 2
  while (takenIds.has(id)) {
    id = `${base}-${String(suffix)}`
    suffix += 1
    stats.slugCollisions += 1
  }
  takenIds.add(id)

  polities.push({
    id,
    wikidata: group.qid,
    rank,
    status,
    existsFrom: earliest,
    existsTo: openEnded ? null : latest,
    names,
    aliases: [...aliases.values()],
    colour: null,
    // Not part of the format — a spike's audit trail, so a wrong grouping can be traced back.
    _ohm: { groupedBy: group.byQid ? 'wikidata' : 'name', relations: members.length },
  })
}

polities.sort((a, b) => String(a.id).localeCompare(String(b.id)))

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(
  outPath,
  JSON.stringify(
    {
      version: 1,
      source: 'OpenHistoricalMap (CC0) — identities only, built by files/spikes/build-registry',
      polities,
      // OHM carries no suzerainty. Relations are editorial and will be entered in the Cartographer.
      relations: [],
    },
    null,
    2
  )
)

/** @param {number} count @returns {string} the count as a percentage of the polities emitted */
const pct = (count) => `${((count / Math.max(1, polities.length)) * 100).toFixed(1)} %`

console.warn(
  `wrote ${outPath} — ${String(polities.length)} polities, ` +
    `${(statSync(outPath).size / 1024).toFixed(0)} KB\n` +
    `\nGROUPING (the question this spike probes)\n` +
    `  relations in cache     ${String(stats.elements)}\n` +
    `  nameless, skipped      ${String(stats.nameless)}\n` +
    `  polities emitted       ${String(polities.length)}\n` +
    `  grouped by Wikidata    ${String(stats.groupedByQid)}  (${pct(stats.groupedByQid)})\n` +
    `  grouped by name only   ${String(stats.groupedByName)}  (${pct(stats.groupedByName)})\n` +
    `  ...of those, spanning >${String(SUSPECT_SPAN_YEARS)}y — SUSPECT MERGES  ${String(stats.suspectMerges)}\n` +
    `  id collisions resolved ${String(stats.slugCollisions)}\n` +
    `\nWHAT IS MISSING\n` +
    `  no rank (border_type)  ${String(stats.noRank)}  (${pct(stats.noRank)})\n` +
    `  no status (place)      ${String(stats.noStatus)}  (${pct(stats.noStatus)})\n` +
    `  no Wikidata id         ${String(stats.noQid)}  (${pct(stats.noQid)})\n` +
    `  no French name         ${String(stats.noFrenchName)}  (${pct(stats.noFrenchName)})\n` +
    `\nDATES\n` +
    `  relations, no start    ${String(stats.noStartDate)}\n` +
    `  relations, end < start ${String(stats.endBeforeStart)}\n` +
    `  still running (no end) ${String(stats.stillRunning)}\n` +
    `  more than one name     ${String(stats.multipleNames)}\n` +
    `\nOTHER\n` +
    `  restrictive licence tag, kept as fact  ${String(stats.restrictiveLicence)}\n` +
    `  suzerainty relations emitted           0 (OHM carries none)`
)
