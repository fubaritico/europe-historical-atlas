import { isMapName } from '@europe-historical-atlas/core/data/mapName'
import { assembleAuthoredYear } from '@europe-historical-atlas/core/data/yearConsistency'
import { openYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import {
  parseYearBorders,
  parseYearPolities,
  parseYearRegistry,
} from '@europe-historical-atlas/core/data/yearSource'

import { cityAlert, cityVerdicts } from '../canvas/cityVerdict'
import { citiesOfYear } from '../state/citiesSlice'

import type { CityVerdict, CityVerdictKind, PolityOnMap } from '../canvas/cityVerdict'
import type { CityAlert } from '../canvas/paint/cityPainter'
import type { CityMark } from '../state/citiesSlice'
import type { ChainEnd } from '@europe-historical-atlas/core/data/vassalChain'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * The cities a map puts on alert, told in a terminal (CARTO-456, the dev through the historian, 2026-11-16): the
 * historian works on those alone — a chain to correct in the base, or a border to give back to the drawing. Judged
 * by the code the canvas paints its dots by — the cities of the map's year (`citiesOfYear`), their verdict
 * (`cityVerdicts`) and its alert (`cityAlert`) — so the command says what the screen shows.
 */

/** A rectangle of the map in degrees, to work region by region. */
export interface LonLatBox {
  /** Its west edge, longitude. */
  readonly west: number
  /** Its south edge, latitude. */
  readonly south: number
  /** Its east edge, longitude. */
  readonly east: number
  /** Its north edge, latitude. */
  readonly north: number
}

/** What the command was asked. */
export interface CityAlertArgs {
  /** The map's folder under `years/` — `1100`, or a Cartographer map's name. */
  readonly map: string
  /** The rectangle to keep, or `null` for the whole map. */
  readonly box: LonLatBox | null
}

/** What a map says of its cities. */
export interface CityAlertReport {
  /** How many cities of the map's year were judged — in the box, if one was given. */
  readonly judged: number
  /** The cities on alert, sorted by their alert, then by name. */
  readonly alerted: readonly AlertedCity[]
  /**
   * The cities in a disputed zone, by name — not on alert, but listed apart (CARTO-511): a polity spilling over its
   * neighbour by a slip of the hand reads the same, so the historian sees them.
   */
  readonly disputed: readonly DisputedCity[]
}

/** A city in a disputed zone, with its verdict. */
export interface DisputedCity {
  /** The city, as the Cartographer holds it. */
  readonly city: CityMark
  /** Its verdict, `disputed`. */
  readonly verdict: CityVerdict
}

/** A verdict that puts a city on alert. */
export type AlertKind = Exclude<CityVerdictKind, 'agrees' | 'disputed'>

/** A city on alert, with what it was judged by. */
export interface AlertedCity {
  /** The city, as the Cartographer holds it. */
  readonly city: CityMark
  /** Its verdict. */
  readonly verdict: CityVerdict
  /** The verdict's kind, on alert. */
  readonly kind: AlertKind
}

/** Why each verdict puts its city on alert, in French. */
const SAID: Readonly<Record<AlertKind, string>> = {
  misplaced: 'le pays dessiné sous elle n’est pas dans sa chaîne',
  incomplete: 'sa chaîne s’arrête faute de maillon, le pays dessiné sous elle n’y est pas',
  toDeclare: 'le titre vérifié n’est pas dessiné sur la carte',
  cannotCompare: 'rien à comparer : ni identifiant Wikidata ni CMS ID',
  notEntered: 'aucun détenteur saisi dans le CMS',
}

/**
 * The colour of the alert ring, named — read from the canvas's own rule (`cityAlert`), never restated per kind, so the
 * text cannot say yellow for a dot the canvas paints red (review ARCH-001).
 */
const COLOUR: Readonly<Record<Exclude<CityAlert, 'disputed'>, string>> = {
  toCorrect: 'jaune',
  missing: 'rouge',
}

/**
 * A verdict on alert, said: its colour, then why.
 * @param kind - the verdict's kind
 * @param reason - why, in French
 * @returns the sentence
 */
function said(kind: AlertKind, reason: string): string {
  const alert = cityAlert(kind)
  // A kind kept by `isAlert` always has a yellow or red one: reaching this means the canvas's rule changed under the
  // command
  if (alert === null || alert === 'disputed')
    throw new Error(
      `[Cartographer] « ${kind} » kept as an alert, but cityAlert gives « ${String(alert)} »`
    )
  return `${COLOUR[alert]} — ${reason}`
}

/**
 * Each kind on alert, its rank in the report: the yellow ones, then the red. A record, so a kind the canvas adds fails
 * the type-check here rather than sorting first and dropping out of the counts (review ARCH-001).
 */
const ALERT_RANK: Readonly<Record<AlertKind, number>> = {
  misplaced: 0,
  incomplete: 1,
  toDeclare: 2,
  cannotCompare: 3,
  notEntered: 4,
}

/** The kinds on alert, in the report's order — read from {@link ALERT_RANK}. */
const ALERT_ORDER: readonly AlertKind[] = (Object.keys(ALERT_RANK) as AlertKind[]).sort(
  (a, b) => ALERT_RANK[a] - ALERT_RANK[b]
)

/**
 * Whether a verdict puts its city on alert — by the canvas's own rule, `cityAlert`: a yellow or a red ring. A
 * disputed zone's ring is no alert (CARTO-511).
 * @param kind - the verdict's kind
 * @returns whether the dot wears an alert
 */
function isAlert(kind: CityVerdictKind): kind is AlertKind {
  const alert = cityAlert(kind)
  return alert !== null && alert !== 'disputed'
}

/**
 * What a polity of the map is recognised by, said: its Wikidata id, else its CMS territory (CARTO-450).
 * @param ids - its ids
 * @param ids.wikidata - its Wikidata id
 * @param ids.territory - its CMS territory number
 * @returns the text
 */
function idText(ids: { wikidata: string | null; territory?: number }): string {
  if (ids.wikidata !== null) return ids.wikidata
  return ids.territory === undefined ? 'sans identifiant' : `CMS ID ${String(ids.territory)}`
}

/** How a reading ends, in French. */
const ENDS: Readonly<Record<ChainEnd, string>> = {
  sovereign: 'jusqu’au souverain',
  unknown: 'arrêtée faute de maillon',
  loop: 'arrêtée sur une boucle de maillons',
}

/** The command's own usage, said with each refusal. */
export const USAGE = 'usage : pnpm cities:alerts --map 1100 [--box=ouest,sud,est,nord]'

/**
 * The content piped in, read as JSON (review QUAL-003): an empty pipe means the CMS's print sent nothing — it failed,
 * its reason above on the standard error — and is said so, rather than as JSON's « unexpected end of input ».
 * @param piped - everything read on the standard input
 * @returns the JSON read
 * @throws {Error} when nothing was piped, or what was is not JSON
 */
export function pipedContent(piped: string): unknown {
  if (piped.trim() === '')
    throw new Error(
      'le CMS n’a rien envoyé : sa commande export:print a échoué, sa raison est plus haut'
    )
  return JSON.parse(piped)
}

/**
 * Read the command's arguments: `--map <name>` (or `--map=<name>`), required, and `--box=west,south,east,north`, in
 * degrees. Anything else is refused, with the usage — a misspelt option silently ignored would list the whole map.
 * @param argv - the arguments after the script's name
 * @returns what was asked
 * @throws when the map is missing or not a map's name, the box malformed, or an argument unknown
 */
export function parseCityAlertArgs(argv: readonly string[]): CityAlertArgs {
  let map: string | null = null
  let box: LonLatBox | null = null
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index] ?? ''
    const [name, inline] = arg.split(/=(.*)/s, 2)
    const value = inline ?? argv[++index]
    if (value === undefined) throw new Error(`${arg} attend une valeur — ${USAGE}`)
    if (name === '--map') map = value
    else if (name === '--box') box = parseBox(value)
    else throw new Error(`argument inconnu : ${arg} — ${USAGE}`)
  }
  if (map === null) throw new Error(`--map manque — ${USAGE}`)
  if (!isMapName(map)) throw new Error(`« ${map} » n’est pas un nom de carte — ${USAGE}`)
  return { map, box }
}

/**
 * A box written `west,south,east,north`, in degrees.
 * @param text - the four numbers
 * @returns the box
 * @throws when there are not four numbers, or the west is not west of the east, or the south not south of the north
 */
function parseBox(text: string): LonLatBox {
  // An empty part is not a number: `Number('')` is 0, which would put an edge on the meridian unasked.
  const parts = text.split(',').map((part) => (part.trim() === '' ? NaN : Number(part)))
  const [west, south, east, north] = parts
  if (
    parts.length !== 4 ||
    west === undefined ||
    south === undefined ||
    east === undefined ||
    north === undefined ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    throw new Error(`--box attend quatre nombres, ouest,sud,est,nord : « ${text} » — ${USAGE}`)
  }
  if (west >= east || south >= north) {
    throw new Error(`--box : l’ouest doit être avant l’est, le sud avant le nord : « ${text} »`)
  }
  return { west, south, east, north }
}

/**
 * The cities of a map on alert — every one whose dot is yellow or red — inside the box if one is given, sorted by
 * their alert, then by name; and apart, the cities in a disputed zone, by name (CARTO-511).
 * @param document - the map
 * @param cities - every city of the content
 * @param box - the rectangle to keep, or `null`
 * @returns how many were judged, the cities on alert and those in a disputed zone, each with its verdict
 */
export function cityAlertReport(
  document: YearDocument,
  cities: readonly CityMark[],
  box: LonLatBox | null
): CityAlertReport {
  const kept = citiesOfYear(cities, document.year).filter(
    ({ lon, lat }) =>
      box === null || (lon >= box.west && lon <= box.east && lat >= box.south && lat <= box.north)
  )
  const verdicts = cityVerdicts(document, kept)
  const alerted = kept
    .flatMap((city) => {
      const verdict = verdicts.get(city.id)
      return verdict === undefined || !isAlert(verdict.kind)
        ? []
        : [{ city, verdict, kind: verdict.kind }]
    })
    .sort(
      (a, b) =>
        ALERT_RANK[a.kind] - ALERT_RANK[b.kind] || a.city.name.localeCompare(b.city.name, 'fr')
    )
  const disputed = kept
    .flatMap((city) => {
      const verdict = verdicts.get(city.id)
      return verdict?.kind === 'disputed' ? [{ city, verdict }] : []
    })
    .sort((a, b) => a.city.name.localeCompare(b.city.name, 'fr'))
  return { judged: kept.length, alerted, disputed }
}

/**
 * The cities on alert, as text: a count by alert, then each city — its sheet, its alert, the country drawn under it,
 * the title checked and the name the map gives it, and each reading of its chain from the holder up, every title
 * with its Wikidata id. Then, apart, the cities in a disputed zone, one line each (CARTO-511).
 * @param report - how many cities were judged, those on alert and those in a disputed zone
 * @param report.judged - how many cities were judged
 * @param report.alerted - the cities on alert
 * @param report.disputed - the cities in a disputed zone
 * @param map - the map's name
 * @returns the text
 */
export function formatCityAlerts(
  { judged, alerted, disputed }: CityAlertReport,
  map: string
): string {
  const counts = ALERT_ORDER.flatMap((kind) => {
    const count = alerted.filter((city) => city.kind === kind).length
    return count === 0 ? [] : [`  ${String(count)} ${kind} — ${said(kind, SAID[kind])}`]
  })
  const head = `Carte ${map} : ${String(alerted.length)} ville(s) en alerte sur ${String(judged)}.`
  const apart =
    disputed.length === 0
      ? []
      : [
          `En zone disputée, pas en alerte — à revoir si la hachure n’est pas voulue : ${String(disputed.length)}`,
          ...disputed.map(formatDisputed),
          '',
        ]
  return [head, ...counts, '', ...alerted.map(formatCity), ...apart].join('\n')
}

const polity = (on: PolityOnMap | null): string =>
  on === null ? 'aucun pays' : `${on.name} (${idText(on)})`

/**
 * One city in a disputed zone, as a line: its sheet, the polity under it holding it by the sources, and the one on top it shares
 * the ground with.
 * @param disputed - the city and its verdict
 * @param disputed.city - the city
 * @param disputed.verdict - its verdict, `disputed`
 * @returns the line
 */
function formatDisputed({ city, verdict }: DisputedCity): string {
  return `  ${city.name} — fiche ${city.id} — ${polity(verdict.onMap)}, sous ${polity(verdict.disputedWith)}`
}

/**
 * Why one city is on alert, from its own verdict: `cannotCompare` has two causes — the country drawn under it has
 * neither a Wikidata id nor a CMS territory (CARTO-450), or, the sheet naming no title, the holder entered as text has
 * no Wikidata id (`cityVerdicts`) — and the
 * historian fixes the one in the map, the other in the base (review QUAL-001).
 * @param verdict - the city's verdict, on alert
 * @param kind - its kind
 * @returns the sentence
 */
function reasonOf(verdict: CityVerdict, kind: AlertKind): string {
  if (kind !== 'cannotCompare') return said(kind, SAID[kind])
  return said(
    kind,
    verdict.chain === null
      ? 'le détenteur saisi en texte n’a pas d’identifiant Wikidata'
      : 'le pays dessiné sous elle n’a ni identifiant Wikidata ni CMS ID'
  )
}

/**
 * One city on alert, as text.
 * @param alerted - the city and its verdict
 * @param alerted.city - the city
 * @param alerted.verdict - its verdict, on alert
 * @param alerted.kind - its kind
 * @returns its lines
 */
function formatCity({ city, verdict, kind }: AlertedCity): string {
  const under =
    verdict.onMap === null
      ? 'aucun pays (terre que personne ne revendique)'
      : `${verdict.onMap.name} (${idText(verdict.onMap)})`
  const lines = [
    `${city.name} — fiche ${city.id} — ${kind} : ${reasonOf(verdict, kind)}`,
    `  position : ${String(city.lon)}, ${String(city.lat)}`,
    `  sous elle : ${under}`,
  ]
  if (verdict.expected !== null) {
    const drawn = verdict.expectedOnMap ?? 'non dessiné'
    lines.push(`  niveau vérifié : ${verdict.expected} — sur la carte : ${drawn}`)
  }
  if (verdict.chain === null) {
    lines.push('  chaîne : aucune (la fiche ne nomme pas de titre)')
    if (verdict.bySources !== null) {
      const { name, wikidata } = verdict.bySources
      lines.push(`  détenteur saisi en texte : ${name} (${wikidata ?? 'sans identifiant'})`)
    }
  } else {
    verdict.chain.forEach((reading, index) => {
      const titles = reading.titles
        .map((title) => `${title.name} (${title.wikidata ?? 'sans identifiant'})`)
        .join(' → ')
      lines.push(`  chaîne ${String(index + 1)}, ${ENDS[reading.end]} : ${titles}`)
    })
  }
  return `${lines.join('\n')}\n`
}

/**
 * Open a map from its folder, its three files checked and cross-checked as the Cartographer opens them — each read
 * through the reader given, so a test hands literals and the command the disk.
 * @param folder - the map's folder, for the reader and the messages
 * @param read - reads one file of the folder, by its name, as text
 * @returns the map
 * @throws when a file cannot be read, is not JSON, or the three do not hold together
 */
export async function openMapFolder(
  folder: string,
  read: (file: string) => Promise<string>
): Promise<YearDocument> {
  const json = async (file: string): Promise<unknown> => JSON.parse(await read(file)) as unknown
  const [registry, polities, borders] = await Promise.all([
    json('registry.json'),
    json('polities.json'),
    json('borders.json'),
  ])
  return openYearDocument(
    assembleAuthoredYear(
      {
        registry: parseYearRegistry(registry, `${folder}/registry.json`),
        polities: parseYearPolities(polities, `${folder}/polities.json`),
        borders: parseYearBorders(borders, `${folder}/borders.json`),
      },
      folder
    )
  )
}
