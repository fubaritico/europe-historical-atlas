import { isOverlapPair, suzerainsOf } from '@europe-historical-atlas/core/data/overlaps'
import { isIdentified, sameTerritory } from '@europe-historical-atlas/core/data/territoryMatch'

import { politiesLocator } from '../geometry/fillHit'

import { projectedTerritories } from './paint/scene'

import type { CityAlert } from './paint/cityPainter'
import type { CityHolder, CityMark } from '../state/citiesSlice'
import type { ContentChainReading } from '@europe-historical-atlas/core/data/contentFormat'
import type { TerritoryIds } from '@europe-historical-atlas/core/data/territoryMatch'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * Who holds a city, by the map and by the sources, and whether they agree (CARTO-193, the dev, 2026-11-02: *"if it is
 * not at the right place, say it is not at the right place; if the country does not exist on the map yet, say it"*).
 *
 * **Compared by Wikidata id first, by the CMS's territory number where one side has none** (CARTO-450, the dev's rule of
 * 2026-11-16, `data/territoryMatch`): a map's polity has its `wikidata` and may carry its `territory`, a title of the
 * chain both. A wrong id in the map's registry therefore reads as a misplaced city — which is how such an id is found
 * (the historian's note `1100/toutes-zones/resultats/wikidata.md`, on the research disk).
 */

/** The polity the map has under a city: its registry id, its name, and what it is recognised by. */
export interface PolityOnMap extends TerritoryIds {
  /** Its id in the registry. */
  readonly id: string
  /** Its name, the registry's. */
  readonly name: string
}

/** What the comparison says. */
export type CityVerdictKind =
  /** Nobody has entered the holder yet. */
  | 'notEntered'
  /**
   * Nothing to compare by: the polity under the city has neither a Wikidata id nor a CMS territory, or — a sheet with no
   * title — the holder entered as text has no Wikidata id.
   */
  | 'cannotCompare'
  /** The map draws no polity for the title checked, or for the sources' holder: it has to be declared. */
  | 'toDeclare'
  /** The map has the sources' holder under the city. */
  | 'agrees'
  /**
   * **In a disputed zone** (CARTO-511): the polity on top is not in the city's chain, but another polity under it is,
   * and the two share hatched ground — neither is the other's suzerain, at any depth, the hatches' own rule
   * (`data/overlaps`). Right by the sources, on ground the map says two polities hold. A slip of the hand that spills
   * a polity over its neighbour reads the same: the model declares no disputed zone (the dev, 2026-11-06), so the
   * hatching on the map and this state are where the author sees it.
   */
  | 'disputed'
  /** The map has another polity, or none, under the city — by its chain, one that is not in it (CARTO-435). */
  | 'misplaced'
  /**
   * The polity under the city is not in its chain, but the chain stops for want of a link — *beyond, we do not know*:
   * it may be higher (CARTO-435), so not shown wrong where a link is missing.
   */
  | 'incomplete'

/** Both answers and their comparison. */
export interface CityVerdict {
  /**
   * The polity the map has under the city — the one painted on top, or, in a disputed zone, the one under it that holds
   * it by the sources, by its chain or by the holder entered —; `null` over ground nobody claims.
   */
  readonly onMap: PolityOnMap | null
  /** In a disputed zone, the polity on top it shares the ground with; `null` otherwise (CARTO-511). */
  readonly disputedWith: PolityOnMap | null
  /** The holder by the sources, or `null` while not entered. */
  readonly bySources: CityHolder | null
  /** Whether they agree, and if not, why. */
  readonly kind: CityVerdictKind
  /** The city's hierarchical chain it was judged by, or `null` when its sheet names no title (CARTO-435). */
  readonly chain: readonly ContentChainReading[] | null
  /**
   * The title of its chain the polity under it must be, or lie under — the level below the sovereign, or the
   * sovereign itself when that level is the holder (the dev, 2026-11-16) — by its name; `null` when the chain
   * reaches no sovereign.
   */
  readonly expected: string | null
  /**
   * The name the map gives the polity carrying that title — « Kingdom of Germany » for « Henri IV — royaume de
   * Germanie, 1100 » (the dev, 2026-11-16) —; `null` when the map draws none, or no title is checked.
   */
  readonly expectedOnMap: string | null
}

/** A polity the map draws, as the verdict needs it: its registry id, its name, its rank. */
export interface DrawnPolity {
  /** Its id in the registry. */
  readonly id: string
  /** Its name, the registry's. */
  readonly name: string
  /** Its rank, or `null`. */
  readonly rank: string | null
}

/** What the map says of its polities: the one that is a given territory, if it draws it. */
export interface MapPolities {
  /**
   * The map's polity that is this territory — by Wikidata id first, by the CMS's number else.
   * @param ids - the territory's ids, a title's or the sources' holder's
   * @returns the polity, or `null` when the map draws none
   */
  readonly find: (ids: TerritoryIds) => DrawnPolity | null
}

/**
 * What a polity of the registry is recognised by — its Wikidata id, and its CMS territory number when it carries one.
 * @param polity - the polity
 * @param polity.wikidata - its Wikidata id
 * @param polity.territory - its CMS territory number
 * @returns its ids
 */
function idsOf(polity: { wikidata: string | null; territory?: number }): TerritoryIds {
  return polity.territory === undefined
    ? { wikidata: polity.wikidata }
    : { wikidata: polity.wikidata, territory: polity.territory }
}

/**
 * The map's polities, as the verdict looks for them (CARTO-450).
 * @param document - the year open
 * @returns the lookup
 */
export function mapPolities(document: YearDocument): MapPolities {
  return {
    find: (ids) => {
      const polity = document.polities.find((each) => sameTerritory(idsOf(each), ids))
      return polity === undefined ? null : { id: polity.id, name: polity.name, rank: polity.rank }
    },
  }
}

/** How far below the sovereign the check goes: an empire's kingdoms and duchies are two levels down, a kingdom's one. */
const LEVELS_BELOW: Readonly<Record<string, number>> = { empire: 2 }

/**
 * The verdict of a city whose chain reaches a sovereign (the dev, 2026-11-16): the check goes to the level below it —
 * n-1 under a kingdom (the duchy, or the viscounty of Bourges held of the king), n-2 under an empire (empire → kingdom
 * → duchy), n-1 where an empire has no level two below. Right when the polity under the city is that title or one
 * below it in the chain; **to declare** (red) when the map has not drawn that title; wrong (yellow) otherwise.
 * @param reading - the reading that ends on a sovereign
 * @param onMap - the polity under the city, or `null`
 * @param map - the map's polities
 * @returns the verdict, the title checked and the name the map gives it
 */
export function bySovereignLevel(
  reading: ContentChainReading,
  onMap: PolityOnMap | null,
  map: MapPolities
): { kind: CityVerdictKind; expected: string; expectedOnMap: string | null } {
  const level = checkedLevel(reading, map)
  const target = reading.titles[level]
  const expected = target?.name ?? ''
  const drawn = target === undefined ? null : map.find(target)
  const expectedOnMap = drawn?.name ?? null
  if (liesWithin(reading, level, onMap)) return { kind: 'agrees', expected, expectedOnMap }
  if (drawn === null) return { kind: 'toDeclare', expected, expectedOnMap }
  return { kind: 'misplaced', expected, expectedOnMap }
}

/**
 * Whether the polity under a city is the title checked, or one below it in the chain — by Wikidata id, else by the
 * CMS's territory number; a polity with neither never.
 * @param reading - the reading
 * @param level - the rank of the title checked
 * @param onMap - the polity under the city, or `null`
 * @returns whether it lies within
 */
function liesWithin(
  reading: ContentChainReading,
  level: number,
  onMap: PolityOnMap | null
): boolean {
  return (
    onMap !== null &&
    reading.titles.slice(0, level + 1).some((title) => sameTerritory(title, onMap))
  )
}

/**
 * The rank, from the holder's title up, of the title a chain ending on a sovereign is checked at: n-1 under a kingdom,
 * n-2 under an empire, n-1 where an empire has no level two below — **never the first link, the city and its holder**:
 * where n-1 is the holder, the sovereign itself is checked (the dev, 2026-11-16,
 * `files/plans/contribution/vassals/saisie-et-exploitation-des-chaines-de-vassalité.md`). The holder is checked only
 * when it is the sovereign — a city-state, Florence and its elected head, the one case.
 * @param reading - the reading that ends on a sovereign
 * @param map - the map's polities, for the sovereign's rank
 * @returns the title's rank in the reading
 */
function checkedLevel(reading: ContentChainReading, map: MapPolities): number {
  const top = reading.titles.length - 1
  if (top <= 0) return 0
  const sovereign = reading.titles[top]
  const rank = sovereign === undefined ? null : (map.find(sovereign)?.rank ?? null)
  const wanted = (rank === null ? undefined : LEVELS_BELOW[rank]) ?? 1
  return Math.max(1, top - wanted)
}

/**
 * A polity of the map under a city, as the verdict compares it: its name and what it is recognised by.
 * @param document - the year open, for the polities' names and ids
 * @param id - the polity's registry id, as the territories carry it
 * @returns the polity
 */
function polityOnMap(document: YearDocument, id: string): PolityOnMap {
  const polity = document.polities.find((candidate) => candidate.id === id)
  // A claim naming a polity the registry lacks is never in the territories (`projectedTerritories`): the id stands in
  // only where that guard were broken, visibly an id rather than a plausible name — as `featureUnder` does.
  if (polity === undefined) return { id, name: id, wikidata: null }
  return { id, name: polity.name, ...idsOf(polity) }
}

/**
 * The verdict of a city that has its hierarchical chain (CARTO-435, the dev's rule of 2026-11-15: *"if the duchy it lies
 * in is not in its chain, it is wrong"*): the polity under it is one of the chain's titles' territories, in any reading
 * — the sources diverging, each reading is a place it may rightly be — by Wikidata id, else by the CMS's territory
 * number (CARTO-450); a polity with neither cannot be looked for. Not found: wrong where every reading reaches its end, and
 * only *incomplete* where one stops for want of a link — the polity may lie above.
 * @param chain - the city's chain, every reading
 * @param onMap - the polity under it, or `null` over ground nobody claims
 * @returns the verdict
 */
export function byChain(
  chain: readonly ContentChainReading[],
  onMap: PolityOnMap | null
): CityVerdictKind {
  if (onMap === null) return 'misplaced'
  if (!isIdentified(onMap)) return 'cannotCompare'
  const inChain = chain.some((reading) =>
    reading.titles.some((title) => sameTerritory(title, onMap))
  )
  if (inChain) return 'agrees'
  return chain.some((reading) => reading.end === 'unknown') ? 'incomplete' : 'misplaced'
}

/** One polity under a city judged: the verdict's kind, and the title checked with the name the map gives it. */
interface Judgement {
  /** The kind. */
  readonly kind: CityVerdictKind
  /** The title checked, by its name, or `null`. */
  readonly expected: string | null
  /** The name the map gives that title's polity, or `null`. */
  readonly expectedOnMap: string | null
}

const plain = (kind: CityVerdictKind): Judgement => ({
  kind,
  expected: null,
  expectedOnMap: null,
})

/**
 * Judge a city against one polity under it — by the chain's sovereign level, by the chain, or by the holder entered.
 * @param city - the city
 * @param onMap - the polity under it, or `null` over ground nobody claims
 * @param map - the map's polities
 * @returns the judgement
 */
function judged(city: CityMark, onMap: PolityOnMap | null, map: MapPolities): Judgement {
  const crowned = city.chain?.find((reading) => reading.end === 'sovereign')
  if (crowned !== undefined) return bySovereignLevel(crowned, onMap, map)
  if (city.chain !== null) return plain(byChain(city.chain, onMap))
  const bySources = city.holder
  if (bySources === null) return plain('notEntered')
  // A sheet with no title: its holder entered as text carries a Wikidata id and no CMS territory, so it is compared
  // by its id alone — deliberately (review QUAL-001, CARTO-450)
  if (bySources.wikidata === null) return plain('cannotCompare')
  if (map.find(bySources) === null) return plain('toDeclare')
  return plain(onMap !== null && sameTerritory(onMap, bySources) ? 'agrees' : 'misplaced')
}

/**
 * Each polity's suzerains at any depth, read once for one judging of the year — the document is edited live, so the
 * memo lives no longer than the call that makes it (review ARCH-003).
 * @param document - the year open
 * @returns the suzerains of a polity, by its id
 */
function suzerainsMemo(document: YearDocument): (polity: string) => ReadonlySet<string> {
  const known = new Map<string, ReadonlySet<string>>()
  return (polity) => {
    const kept = known.get(polity)
    if (kept !== undefined) return kept
    const read = suzerainsOf(document, polity)
    known.set(polity, read)
    return read
  }
}

/**
 * Compare, for each city, who holds it on the map with who holds it by the sources — the territories projected once
 * for them all. **Judged against the polity on top first, as the canvas paints it**; where that one is not in the
 * city's chain, against each other polity under it sharing hatched ground with it: the first right one makes the
 * city *disputed* (CARTO-511), never plainly right.
 * @param document - the year open
 * @param cities - the cities of that year
 * @returns each city's verdict, by its id
 */
export function cityVerdicts(
  document: YearDocument,
  cities: readonly CityMark[]
): ReadonlyMap<string, CityVerdict> {
  const under = politiesLocator(projectedTerritories(document, document.anchors))
  const map = mapPolities(document)
  const above = suzerainsMemo(document)
  return new Map(
    cities.map((city) => {
      const [top, ...below] = under([city.lon, city.lat])
      const onTop = top === undefined ? null : polityOnMap(document, top)
      const verdict = (
        judgement: Judgement,
        onMap: PolityOnMap | null,
        disputedWith: PolityOnMap | null
      ): [string, CityVerdict] => [
        city.id,
        { ...judgement, onMap, disputedWith, bySources: city.holder, chain: city.chain },
      ]
      const first = judged(city, onTop, map)
      if (top === undefined || (first.kind !== 'misplaced' && first.kind !== 'incomplete'))
        return verdict(first, onTop, null)
      for (const id of below) {
        // Only the ground the map hatches: a duchy drawn inside its kingdom is a hierarchical tie, never a disputed zone
        if (!isOverlapPair(above, top, id)) continue
        const other = polityOnMap(document, id)
        const second = judged(city, other, map)
        if (second.kind === 'agrees') return verdict({ ...second, kind: 'disputed' }, other, onTop)
      }
      return verdict(first, onTop, null)
    })
  )
}

/**
 * The polity whose colour fills a city's dot (the dev, 2026-11-16: *"well placed, it has the colour of the country it
 * is in"*). At the right place, the polity under it. Elsewhere, the one that holds it — by its chain, the first title
 * from the holder up that the map has drawn; without a chain, the sources' holder — so a dot of one colour on
 * another's ground shows at once (2026-11-05). `null` — a hollow dot — when the map has none.
 * @param verdict - the city's verdict
 * @param map - the map's polities
 * @returns the registry id of the polity to paint, or `null`
 */
export function paintedHolder(verdict: CityVerdict, map: MapPolities): string | null {
  if (verdict.kind === 'agrees' || verdict.kind === 'disputed') return verdict.onMap?.id ?? null
  if (verdict.chain === null)
    return verdict.bySources === null ? null : (map.find(verdict.bySources)?.id ?? null)
  return firstDrawn(verdict.chain, map)
}

/**
 * The first title of a chain, from the holder up, that the map has drawn — every reading in turn.
 * @param chain - the city's chain
 * @param map - the map's polities
 * @returns the registry id of its polity, or `null` when the map draws none
 */
function firstDrawn(chain: readonly ContentChainReading[], map: MapPolities): string | null {
  for (const reading of chain) {
    for (const title of reading.titles) {
      const drawn = map.find(title)
      if (drawn !== null) return drawn.id
    }
  }
  return null
}

/**
 * The alert a verdict raises, or none — the dev's rule, 2026-11-16 (*"a point not at the right place is yellow; a
 * technical problem is red; well placed, it has the colour of the country it is in"*): **yellow** for a city the map
 * does not put in its chain — misplaced, a holder not drawn yet, or a chain that stops short of the polity under it;
 * **red** for what the data cannot answer — no holder entered, a polity under it with no Wikidata id to compare, or
 * a title the check needs that the map has not drawn (*"red, when the duchy does not exist"*).
 * **Disputed** (CARTO-511, the dev, 2026-11-24: *"in the right state but not in the right fief — we need a mark all the
 * same"*): a mark of its own, neither an error nor plain — the ring in the two polities' colours.
 * Only a city at the right place keeps its plain look. The slate of CARTO-435 is gone: it hid the yellow.
 * @param kind - the verdict
 * @returns the alert, or `null`
 */
export function cityAlert(kind: CityVerdictKind): CityAlert | null {
  if (kind === 'notEntered' || kind === 'cannotCompare' || kind === 'toDeclare') return 'missing'
  if (kind === 'misplaced' || kind === 'incomplete') return 'toCorrect'
  if (kind === 'disputed') return 'disputed'
  return null
}
