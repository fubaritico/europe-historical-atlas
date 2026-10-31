// The CMS seed's cities of 1100, written from the three sources side by side (out/cities-1100.csv, by merge.mjs).
//
//   node files/spikes/city-sources/merge.mjs 1100     (first: fetches the three datasets into out/, git-ignored)
//   node files/spikes/city-sources/seed-data.mjs
//
// Writes packages/cms/src/seed/cities1100.ts. The rule that picks and ranks them (ATLAS-295, the dev, 2026-10-31):
// a capital where Bosker et al. say capital; a large city where they say archbishopric — in the Middle Ages the
// religious seat is a political one; a city where all three sources give a figure. Every figure and role becomes a
// source line of its own, never averaged.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CSV = join(HERE, 'out/cities-1100.csv')
const TARGET = join(HERE, '../../../packages/cms/src/seed/cities1100.ts')
const YEAR = 1100
const THOUSAND = 1000

/**
 * The 59 cities: the dataset's name, the Wikidata item and the French name the 1100 map gives it. Each item was
 * found by a search on the name kept within 30 km of the dataset's position, and its description read (2026-10-31);
 * Fustat and Valencia were picked by hand, the search having put a park and nothing first. Where the city's name
 * has changed since, the name is the one of 1100 (Antioche, Édesse, Smyrne).
 */
const CITIES = [
  ['Baghdad', 'Q1530', 'Bagdad'],
  ['Constantinople', 'Q16869', 'Constantinople'],
  ['Fustat', 'Q839456', 'Fostat'],
  ['Marakesh', 'Q101625', 'Marrakech'],
  ['Palermo', 'Q2656', 'Palerme'],
  ['Sevilla', 'Q8717', 'Séville'],
  ['Cordoba', 'Q5818', 'Cordoue'],
  ['Bougie', 'Q59975', 'Bougie'],
  ['Paris', 'Q90', 'Paris'],
  ['Granada', 'Q8810', 'Grenade'],
  ['Venezia', 'Q641', 'Venise'],
  ['Salerno', 'Q1083', 'Salerne'],
  ['Saloniki', 'Q17151', 'Thessalonique'],
  ['Milano', 'Q490', 'Milan'],
  ['Alexandria', 'Q87', 'Alexandrie'],
  ['Siwas', 'Q107401', 'Sébaste'],
  ['Antiochia', 'Q80561', 'Antioche'],
  ['Urfa', 'Q133118', 'Édesse'],
  ['Damascus', 'Q3766', 'Damas'],
  ['Koeln', 'Q365', 'Cologne'],
  ['Roma', 'Q220', 'Rome'],
  ['Toledo', 'Q5836', 'Tolède'],
  ['London', 'Q84', 'Londres'],
  ['Napoli', 'Q2634', 'Naples'],
  ['Iconum', 'Q79857', 'Iconium'],
  ['Ephese', 'Q47611', 'Éphèse'],
  ['Mainz', 'Q1720', 'Mayence'],
  ['Palma', 'Q8826', 'Palma'],
  ['Almeria', 'Q10400', 'Almería'],
  ['Leon', 'Q15699', 'León'],
  ['Nicea', 'Q217125', 'Nicée'],
  ['Ceasarea', 'Q48338', 'Césarée de Cappadoce'],
  ['Jerusalem', 'Q1218', 'Jérusalem'],
  ['Narbonne', 'Q6555', 'Narbonne'],
  ['Trier', 'Q3138', 'Trèves'],
  ['Lyon', 'Q456', 'Lyon'],
  ['Metz', 'Q22690', 'Metz'],
  ['Poitiers', 'Q6616', 'Poitiers'],
  ['Rouen', 'Q30974', 'Rouen'],
  ['Valencia', 'Q8818', 'Valence'],
  ['Zaragoza', 'Q10305', 'Saragosse'],
  ['Adrianople', 'Q43387', 'Andrinople'],
  ['Tyrus', 'Q82070', 'Tyr'],
  ['Plovdiv', 'Q459', 'Philippopolis'],
  ['Brescia', 'Q6221', 'Brescia'],
  ['Toulouse', 'Q7880', 'Toulouse'],
  ['Erfurt', 'Q1729', 'Erfurt'],
  ['Malaga', 'Q8851', 'Malaga'],
  ['Trapezunt', 'Q45301', 'Trébizonde'],
  ['Smyrna', 'Q35997', 'Smyrne'],
  ['Tripolis', 'Q168954', 'Tripoli'],
  ['Reims', 'Q41876', 'Reims'],
  ['York', 'Q42462', 'York'],
  ['Praha', 'Q1085', 'Prague'],
  ['Arles', 'Q48292', 'Arles'],
  ['Tarsus', 'Q134287', 'Tarse'],
  ['Ohrid', 'Q1223508', 'Ohrid'],
  ['Durres', 'Q83285', 'Durazzo'],
  ['Ankara', 'Q3640', 'Ancyre'],
]

/**
 * The cities of Hungary, Poland, the Rus' lands and Scandinavia (the dev, 2026-10-31: *« ajoute plus de villes […] en
 * Hongrie, dans Pologne, les pays russes. Un peu la Scandinavie »*): Bosker gives them no role and seldom a figure, so
 * the rule above would keep none. **These are the cities Buringh attests there**, ranked a city — **a capital where
 * Wikidata dates the city « capital of » (P1376) a polity over 1100** ({@link WIKIDATA_CAPITALS}). Resolved like the
 * first list, the descriptions read (2026-10-31). Murom was not found and is left out.
 */
const EAST = [
  ['Esztergom', 'Q171353', 'Esztergom'],
  ['Szekesfehervar', 'Q130212', 'Székesfehérvár'],
  ['Gyoer', 'Q134494', 'Győr'],
  ['Nitra', 'Q26397', 'Nitra'],
  ['Bratislava', 'Q1780', 'Presbourg'],
  ['Krakow', 'Q31487', 'Cracovie'],
  ['Gniezno', 'Q51432', 'Gniezno'],
  ['Plock', 'Q104725', 'Płock'],
  ['Poznan', 'Q268', 'Poznań'],
  ['Gdansk', 'Q1792', 'Gdańsk'],
  ['Kiev', 'Q1899', 'Kiev'],
  ['Novgorod', 'Q2235', 'Novgorod'],
  ['Cernigov', 'Q157053', 'Tchernigov'],
  ['Smolensk', 'Q2337', 'Smolensk'],
  ['Polock', 'Q200797', 'Polotsk'],
  ['Rostov', 'Q193342', 'Rostov'],
  ['Pskov', 'Q2214', 'Pskov'],
  ['Roskilde', 'Q26563', 'Roskilde'],
  ['Lund', 'Q2167', 'Lund'],
  ['Trondheim', 'Q25804', 'Nidaros'],
  ['Bergen', 'Q26793', 'Bergen'],
  // The second pass, the same evening (*« des zones où moi j'aurais vu plus de villes […] des gens de différentes
  // nations vont consulter l'Atlas »*): the Rus' south and east, the Caucasus, Mesopotamia and Persia, Ireland,
  // Scotland, Wales's march, Sweden. Wasit and Perth were not found; Cardiff's item stood 22 km off the dataset's point,
  // and is left out.
  ['Kursk', 'Q3159', 'Koursk'],
  ['Rjazan', 'Q2746', 'Riazan'],
  ['Vladimir', 'Q2684', 'Vladimir'],
  ['Vitebsk', 'Q102217', 'Vitebsk'],
  ['Derbent', 'Q131416', 'Derbent'],
  ['Nahicevan', 'Q230104', 'Nakhitchevan'],
  ['Rayy', 'Q636188', 'Rayy'],
  ['Basra', 'Q48195', 'Bassora'],
  ['Diyarbakr', 'Q83387', 'Amid'],
  ['Raqqa', 'Q283368', 'Raqqa'],
  ['Kufa', 'Q186234', 'Koufa'],
  ['Nishapur', 'Q131350', 'Nichapour'],
  ['Kerman', 'Q171714', 'Kerman'],
  ['Dublin', 'Q1761', 'Dublin'],
  ['Armagh', 'Q193452', 'Armagh'],
  ['Cork', 'Q36647', 'Cork'],
  ['Waterford', 'Q183551', 'Waterford'],
  ['Limerick', 'Q133315', 'Limerick'],
  ['Edinburgh', 'Q23436', 'Édimbourg'],
  ['St Andrews', 'Q207736', 'Saint Andrews'],
  ['Chester', 'Q170263', 'Chester'],
  ['Hereford', 'Q204720', 'Hereford'],
  ['Shrewsbury', 'Q201970', 'Shrewsbury'],
  ['Vasteras', 'Q25412', 'Västerås'],
  ['Visby', 'Q54757', 'Visby'],
  ['Kalmar', 'Q26345', 'Kalmar'],
]

/**
 * The « capital of » (P1376) claims Wikidata dates over 1100, read on 2026-10-31 — one per city, the polity named as
 * Wikidata names it. A claim with no start, or one that starts after 1100 (Novgorod's republic, from 1136), does not
 * count: the seats of Novgorod, Chernigov, Smolensk, Polotsk, Rostov, Roskilde and Nidaros wait for a source of their
 * own.
 */
const WIKIDATA_CAPITALS = {
  Q171353: { polity: 'Kingdom of Hungary', id: 'Q171150', from: 1001, to: 1256 },
  Q130212: { polity: 'Kingdom of Hungary', id: 'Q171150', from: 1000, to: 1543 },
  Q104725: { polity: 'Kingdom of Poland', id: 'Q8890160', from: 1079, to: 1138 },
  Q1899: { polity: "Kievan Rus'", id: 'Q1108445', from: 882, to: 1132 },
}

/** The register's title of Wikidata, the source of the eastern capitals. */
const WIKIDATA = 'Wikidata'

/** The register's titles of the three sources — what finds each again. */
const BOSKER = 'From Baghdad to London: Unraveling Urban Development in Europe, the Middle East, and North Africa, 800–1800 (données)'
const BURINGH = 'European urban population, 700–2000'
const CHANDLER = 'Spatializing 6,000 years of global urbanization from 3700 BC to AD 2000 (données, d’après Chandler 1987)'

/** Bosker's roles that are a reason, and the reason's French name in the CMS. */
const REASON_OF_ROLE = { archbishop: 'archevêché', bishop: 'évêché', university: 'université' }

function parse(line) {
  const out = []
  let cur = ''
  let quoted = false
  for (const c of line) {
    if (c === '"') quoted = !quoted
    else if (c === ',' && !quoted) {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

const [head, ...lines] = readFileSync(CSV, 'utf8').trim().split('\n')
const columns = parse(head)
// A name can come twice (Tripolis in Lebanon and in Greece): the CSV runs from the largest city down, so the first
// one is kept — the one the list means.
const rows = new Map()
for (const line of lines) {
  const row = Object.fromEntries(parse(line).map((value, i) => [columns[i], value]))
  if (rows.has(row.name)) console.warn(`[seed-data] a second ${row.name} is left out (${row.lat}, ${row.lon})`)
  else rows.set(row.name, row)
}

/** A figure in thousands as inhabitants, or null when the source gives none. */
const inhabitants = (value) => (value === '' ? null : Math.round(Number(value) * THOUSAND))
/** Buringh's bases were read as Latin-1 somewhere upstream: « faÃ§ade » is « façade ». */
const repair = (text) => (/Ã/.test(text) ? Buffer.from(text, 'latin1').toString('utf8') : text)

/**
 * A city of the first list: Bosker's roles rank it, and the three sources must all give a figure to a mere city.
 * @param {[string, string]} city - its dataset name and Wikidata item
 * @returns the sheet
 */
function sheet([key, wikidata]) {
  const row = rows.get(key)
  if (row === undefined) throw new Error(`[seed-data] ${key} is not in ${CSV}`)
  const roles = row.roles === '' ? [] : row.roles.split(' ')
  const importance = roles.includes('capital') ? 'capital' : roles.includes('archbishop') ? 'large-city' : 'city'
  // The rule, checked rather than trusted to the hand-written list: a city that is neither a capital nor an
  // archbishopric is kept only when all three sources give it a figure.
  if (importance === 'city' && row.sources !== '3') {
    throw new Error(`[seed-data] ${key} is neither a capital nor an archbishopric, and only ${row.sources} sources give it a figure`)
  }
  const testimonies = []
  if (roles.includes('capital')) {
    testimonies.push({ source: BOSKER, subject: 'importance', importance: 'capital', where: 'rôles de la ville en 1100' })
  }
  return finish(row, wikidata, importance, roles, testimonies)
}

/**
 * A city of the regions the first rule leaves empty: a capital where Wikidata dates it so over 1100 or Bosker says
 * capital, a large city where Bosker says archbishopric, a city otherwise; one of the three sources must give it a
 * figure, and Bosker's roles, where it gives them, are its reasons.
 * @param {[string, string]} city - its dataset name and Wikidata item
 * @returns the sheet
 */
function eastSheet([key, wikidata]) {
  const row = rows.get(key)
  if (row === undefined) throw new Error(`[seed-data] ${key} is not in ${CSV}`)
  if (row.bosker === '' && row.buringh === '' && row.chandler === '') {
    throw new Error(`[seed-data] no source gives ${key} a figure`)
  }
  const roles = row.roles === '' ? [] : row.roles.split(' ')
  const claim = WIKIDATA_CAPITALS[wikidata]
  const testimonies = []
  if (claim !== undefined) {
    const where = `« capitale de » (P1376) ${claim.polity} (${claim.id}), ${claim.from}–${claim.to}, sur l’item ${wikidata} — lu le 31/10/2026`
    testimonies.push({ source: WIKIDATA, subject: 'importance', importance: 'capital', where })
  }
  if (roles.includes('capital')) {
    testimonies.push({ source: BOSKER, subject: 'importance', importance: 'capital', where: 'rôles de la ville en 1100' })
  }
  const capital = claim !== undefined || roles.includes('capital')
  const importance = capital ? 'capital' : roles.includes('archbishop') ? 'large-city' : 'city'
  return finish(row, wikidata, importance, roles, testimonies)
}

/**
 * A sheet's reasons and population lines, after its importance lines.
 * @param row - the city's row in the merged sources
 * @param {string} wikidata - its place's item
 * @param {string} importance - its order
 * @param {string[]} roles - Bosker's roles
 * @param testimonies - the lines so far
 * @returns the sheet
 */
function finish(row, wikidata, importance, roles, testimonies) {
  const reasons = roles.filter((role) => role in REASON_OF_ROLE).map((role) => REASON_OF_ROLE[role])
  for (const reason of reasons) {
    testimonies.push({ source: BOSKER, subject: 'reason', reason, where: 'rôles de la ville en 1100' })
  }
  const bosker = inhabitants(row.bosker)
  if (bosker !== null) {
    const where = row.bosker_between === 'true' ? '1100 — à mi-chemin entre 1000 et 1200 : sans doute interpolé' : '1100'
    testimonies.push({ source: BOSKER, subject: 'population', population: bosker, where })
  }
  const buringh = inhabitants(row.buringh)
  if (buringh !== null) {
    const nature = { imputed: ', estimation imputée', proxied: ', estimée d’après un indice' }[row.buringh_nature] ?? ''
    const basis = row.buringh_basis === '' ? '' : ` — ${repair(row.buringh_basis).trim()}`
    testimonies.push({ source: BURINGH, subject: 'population', population: buringh, where: `1100${nature}${basis}` })
  }
  const chandler = inhabitants(row.chandler)
  if (chandler !== null) {
    const where = row.chandler_certainty === '' ? '1100' : `1100, certitude ${row.chandler_certainty} dans les données`
    testimonies.push({ source: CHANDLER, subject: 'population', population: chandler, where })
  }
  return { place: wikidata, year: YEAR, importance, reasons, testimonies }
}

const sheets = [...CITIES.map(sheet), ...EAST.map(eastSheet)]
const places = [...CITIES, ...EAST].map(([, wikidata, name]) => ({ wikidata, name }))
const reasons = [...new Set(sheets.flatMap((s) => s.reasons))].sort()
const json = (value) => JSON.stringify(value, null, 2)

const file = `/* eslint-disable max-lines -- generated data, one record a city: the budget measures code written by hand */
/**
 * The cities of 1100 the seed writes (ATLAS-295, \`files/plans/atlas/cities.md\`) — **generated** by
 * \`files/spikes/city-sources/seed-data.mjs\` from the three open sources side by side; edit the script, not this file.
 *
 * The rule (the dev, 2026-10-31): a **capital** where Bosker et al. (2013) say capital; a **large city** where they say
 * archbishopric — in the Middle Ages a religious seat is a political one; a **city** where all three sources give a
 * figure. Every figure and every role is a source line of its own, never averaged; a figure Bosker interpolated
 * between two centuries says so. **The east and the north** (the dev, the same evening): the cities Buringh attests in
 * Hungary, Poland, the Rus' lands and Scandinavia — a capital where Wikidata dates it so over 1100, a city otherwise.
 * The places are named by their Wikidata items, read by the seed as the form does.
 */

import type { SeedPlace, SeedSource } from './year1100'
import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'

/** What a source line says — the same three subjects as the form, its relations named by what finds them again. */
export type SeedTestimony = (
  | { subject: 'population'; population: number }
  | { subject: 'importance'; importance: CityImportance }
  | { subject: 'reason'; reason: string }
) & {
  /** The title of the source that says it. */
  source: string
  /** Where in the source, or how it gives the figure. */
  where?: string
}

/** A city at a date, its relations named by what finds them again. */
export interface SeedCity {
  /** The Wikidata id of its place. */
  place: string
  /** The year the sheet is for. */
  year: number
  /** Its importance on the map. */
  importance: CityImportance
  /** The French names of the reasons for it. */
  reasons: readonly string[]
  /** What each source says of it. */
  testimonies: readonly SeedTestimony[]
}

/** The three open datasets the figures and roles come from. */
export const CITY_SOURCES: readonly SeedSource[] = [
  {
    title: ${JSON.stringify(WIKIDATA)},
    author: 'Contributeurs de Wikidata',
    publisher: 'Wikimedia Foundation',
    editionYear: 2026,
    kind: 'crowd-database',
    url: 'https://www.wikidata.org',
    licence: 'cc0',
  },
  {
    title: ${JSON.stringify(BOSKER)},
    author: 'Maarten Bosker, Eltjo Buringh, Jan Luiten van Zanden',
    publisher: 'Harvard Dataverse',
    editionYear: 2013,
    kind: 'scholarly',
    url: 'https://doi.org/10.7910/DVN/24747',
    licence: 'cc0',
  },
  {
    title: ${JSON.stringify(BURINGH)},
    author: 'Eltjo Buringh',
    publisher: 'DANS',
    editionYear: 2021,
    kind: 'scholarly',
    url: 'https://doi.org/10.17026/DANS-XZY-U62Q',
    licence: 'cc0',
  },
  {
    title: ${JSON.stringify(CHANDLER)},
    author: 'Meredith Reba, Femke Reitsma, Karen C. Seto',
    publisher: 'figshare',
    editionYear: 2016,
    kind: 'scholarly',
    url: 'https://figshare.com/articles/Chandler_Population_Data/2059494',
    licence: 'cc-by',
  },
]

/** The reasons the cities give, by French name. */
export const CITY_REASONS: readonly string[] = ${json(reasons)}

/** The places of the cities. */
export const CITY_PLACES: readonly SeedPlace[] = ${json(places)}

/** The cities of 1100. */
export const CITIES_1100: readonly SeedCity[] = ${json(sheets)}
`
writeFileSync(TARGET, file)
// Formatted by the repository's own Prettier, so the file passes the CMS's lint as it is written.
execFileSync(join(HERE, '../../../node_modules/.bin/prettier'), ['--write', TARGET], { stdio: 'inherit' })
console.warn(`[seed-data] ${sheets.length} cities: ${sheets.filter((s) => s.importance === 'capital').length} capitals, ${sheets.filter((s) => s.importance === 'large-city').length} large cities, ${sheets.filter((s) => s.importance === 'city').length} cities → ${TARGET}`)
