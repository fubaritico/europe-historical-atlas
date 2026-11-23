import type { ItemLabels } from './wikidataLabels'
import type { ContentPlace } from '@europe-historical-atlas/core/data/contentFormat'

/** One place whose name differs from Wikidata's, to be sorted: a name of the time, or a variant of spelling. */
export interface NameGap {
  /** The place's id in the contribution. */
  place: string
  /** Its French name in the base. */
  name: string
  /** Its Wikidata item. */
  wikidata: string
  /** Wikidata's name: its French label, else its English one, else its multilingual one. */
  wikidataName: string
  /** Which of Wikidata's labels the name was compared with. */
  language: 'fr' | 'en' | 'mul'
  /** Whether Wikidata knows the base's name as another French name of the item. */
  alias: boolean
}

/** A place whose Wikidata item Wikidata does not know. */
export interface UnknownItem {
  /** The place's id in the contribution. */
  place: string
  /** Its French name in the base. */
  name: string
  /** The item it carries. */
  wikidata: string
}

/** What the comparison of every place's name with Wikidata's says. */
export interface NameReport {
  /** The places read, each once. */
  places: number
  /** Those whose name is Wikidata's — its French one, else its English one, else its multilingual one. */
  same: number
  /** Those whose different name was already sorted and kept (`keptNames.ts`). */
  kept: number
  /** Those with no Wikidata item: nothing to compare. */
  noItem: number
  /** Those whose item Wikidata gives no French, English or multilingual name. */
  noLabel: number
  /** The places whose item Wikidata does not know — a mistyped or merged item. */
  unknown: UnknownItem[]
  /** The names to sort, in the order of the places' ids. */
  gaps: NameGap[]
}

/**
 * The Wikidata items to ask for: each once, however many places or dated sheets carry it.
 * @param places - the places, possibly repeated
 * @returns the items, in the order first met
 */
export function wikidataItemsOf(places: readonly ContentPlace[]): string[] {
  return [...new Set(places.flatMap((place) => (place.wikidata === null ? [] : [place.wikidata])))]
}

/**
 * The name of Wikidata the base's name is compared with: French first, then English, then multilingual.
 * @param names - Wikidata's names for the item
 * @returns the language and the name, the name `null` when the item has none of the three
 */
function wikidataNameOf(names: ItemLabels): ['fr' | 'en' | 'mul', string | null] {
  if (names.fr !== null) return ['fr', names.fr]
  if (names.en !== null) return ['en', names.en]
  return ['mul', names.mul]
}

/**
 * A name as the comparison sees it: lower case, without accents, a hyphen as a space — « Saint-Denis » and « saint
 * denis » are one name; « Pruse » and « Bursa » are two.
 * @param name - the name
 * @returns its folded form
 */
export function foldName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .toLowerCase()
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compare each place's French name with the name Wikidata gives its item (CMS-495, the control of the names): its French
 * label, else its English one, else its multilingual one (`mul`, the only name some items have since 2024). A different
 * name is listed to be sorted, unless it was sorted already and is still the same name.
 * @param places - the places, possibly repeated (one a dated sheet): each is read once
 * @param labels - Wikidata's names, by item
 * @param kept - the names already sorted and kept, by place id
 * @returns the counts and the names to sort
 */
export function compareNames(
  places: readonly ContentPlace[],
  labels: ReadonlyMap<string, ItemLabels>,
  kept: ReadonlyMap<number, string>
): NameReport {
  const report: NameReport = {
    places: 0,
    same: 0,
    kept: 0,
    noItem: 0,
    noLabel: 0,
    unknown: [],
    gaps: [],
  }
  const seen = new Set<string>()
  for (const place of places) {
    if (seen.has(place.id)) continue
    seen.add(place.id)
    report.places += 1
    judge(place, labels, kept, report)
  }
  report.gaps.sort((a, b) => Number(a.place) - Number(b.place))
  return report
}

/**
 * Where one place goes in the report.
 * @param place - the place
 * @param labels - Wikidata's names, by item
 * @param kept - the names already sorted and kept
 * @param report - the report, counted into
 */
function judge(
  place: ContentPlace,
  labels: ReadonlyMap<string, ItemLabels>,
  kept: ReadonlyMap<number, string>,
  report: NameReport
): void {
  if (place.wikidata === null) {
    report.noItem += 1
    return
  }
  const names = labels.get(place.wikidata)
  if (names === undefined) {
    report.unknown.push({ place: place.id, name: place.name.fr, wikidata: place.wikidata })
    return
  }
  const [language, wikidataName] = wikidataNameOf(names)
  if (wikidataName === null) {
    report.noLabel += 1
    return
  }
  if (foldName(wikidataName) === foldName(place.name.fr)) {
    report.same += 1
    return
  }
  if (kept.get(Number(place.id)) === place.name.fr) {
    report.kept += 1
    return
  }
  const folded = foldName(place.name.fr)
  report.gaps.push({
    place: place.id,
    name: place.name.fr,
    wikidata: place.wikidata,
    wikidataName,
    language,
    alias: language === 'fr' && names.aliasesFr.some((alias) => foldName(alias) === folded),
  })
}
