/**
 * A map confronted with the CMS (CARTO-568, `s10`'s « the map against the CMS »). The dev's calls: the CMS is the only
 * source of truth (2026-11-25); the map keeps each polity's name and dates, aligned on the CMS's, then locked
 * (2026-11-27):
 *
 * - a polity tied by **its territory's number** is aligned with the others at once;
 * - a polity tied by **its Wikidata item only** is aligned one at a time, on the author's click — Cliopatria's items are
 *   sometimes wrong (« Buyid Dynasty » carries the Abbasid Caliphate's) — and aligning it writes the number;
 * - the name taken is the CMS's French one, the register's own;
 * - **a date the CMS does not have is never erased**: the map keeps its own, editable, listed « to enter in the CMS ».
 *
 * Pure: the territories are read by the caller, live from the CMS.
 */

import type { ContentTerritory } from './contentFormat'
import type { YearPolity } from './yearFormat'

/** The two dates a polity and a territory both carry. */
export type DateField = 'existsFrom' | 'existsTo'

/** The dates, in the form's order. */
const DATE_FIELDS: readonly DateField[] = ['existsFrom', 'existsTo']

/** A polity of the map, as a check names it. */
export interface PolityNamed {
  /** Its id on the map. */
  readonly id: string
  /** Its name on the map. */
  readonly name: string
}

/** A polity tied to nothing in the CMS. */
export interface UntiedPolity extends PolityNamed {
  /**
   * Why: `none` — neither a number nor a Wikidata item the CMS knows; `missing` — it carries a number no territory of the
   * CMS has any more (removed or merged since).
   */
  readonly reason: 'none' | 'missing'
  /** The number it carries, when `missing`. */
  readonly territory?: number
}

/** A polity tied to a territory of the CMS, and how far apart the two are. */
export interface TiedPolity extends PolityNamed {
  /** The territory. */
  readonly cms: ContentTerritory
  /** How it is tied: by its territory's number, or by its Wikidata item only. */
  readonly tie: 'number' | 'wikidata'
  /** Whether its name is not the CMS's French name. */
  readonly nameDiffers: boolean
  /**
   * Whether it carries another Wikidata item than its territory's — a polity tied by number to one territory and, by
   * `territoryMatch.sameTerritory` (Wikidata first, the dev's rule of 2026-11-16), to another: the atlas would name it
   * after that other one. Aligning writes the territory's item.
   */
  readonly wikidataDiffers: boolean
  /** The dates the CMS gives and the map writes otherwise. */
  readonly datesDiffer: readonly DateField[]
  /** The dates the map gives and the CMS does not — kept on the map, to enter in the CMS. */
  readonly missingInCms: readonly DateField[]
}

/** A map confronted with the CMS, in the map's order within each group. */
export interface MapAlignment {
  /** The polities tied to nothing. */
  readonly untied: readonly UntiedPolity[]
  /** Tied by number, and apart from the CMS in their name or a date: aligned all at once. */
  readonly toAlign: readonly TiedPolity[]
  /** Tied by their Wikidata item only: each aligned on the author's click, which writes its number. */
  readonly toConfirm: readonly TiedPolity[]
  /** Tied by number, with a date the CMS lacks — whether or not anything else differs. */
  readonly toEnterInCms: readonly TiedPolity[]
}

/**
 * A territory's date, an export written before CARTO-488 carrying none read as « none given ».
 * @param territory - the territory
 * @param field - which date
 * @returns the year, or `null`
 */
function cmsDate(territory: ContentTerritory, field: DateField): number | null {
  return territory[field] ?? null
}

/**
 * How a polity is tied to the CMS: by its number when it carries one — the author's or the alignment's choice —, else
 * by its Wikidata item.
 * @param polity - the polity
 * @param byNumber - the territories by number
 * @param byWikidata - the territories by Wikidata item
 * @returns the territory and the tie, `missing` for a number the CMS no longer has, or `null` when nothing ties it
 */
function tieOf(
  polity: Pick<YearPolity, 'wikidata' | 'territory'>,
  byNumber: ReadonlyMap<number, ContentTerritory>,
  byWikidata: ReadonlyMap<string, ContentTerritory>
): { cms: ContentTerritory; tie: TiedPolity['tie'] } | 'missing' | null {
  if (polity.territory !== undefined) {
    const cms = byNumber.get(polity.territory)
    return cms === undefined ? 'missing' : { cms, tie: 'number' }
  }
  const cms = polity.wikidata === null ? undefined : byWikidata.get(polity.wikidata)
  return cms === undefined ? null : { cms, tie: 'wikidata' }
}

/**
 * Whether a polity and its territory carry two different Wikidata items — the case where the number ties one territory
 * and `sameTerritory`, which compares the items first, another.
 * @param polity - the polity
 * @param cms - its territory
 * @returns whether both carry an item, and they differ
 */
function wikidataConflict(
  polity: Pick<YearPolity, 'wikidata'>,
  cms: Pick<ContentTerritory, 'wikidata'>
): boolean {
  return polity.wikidata !== null && cms.wikidata !== null && polity.wikidata !== cms.wikidata
}

/**
 * A tied polity's distance from its territory.
 * @param polity - the polity
 * @param cms - its territory
 * @param tie - how it is tied
 * @returns the comparison
 */
function compare(polity: YearPolity, cms: ContentTerritory, tie: TiedPolity['tie']): TiedPolity {
  return {
    id: polity.id,
    name: polity.name,
    cms,
    tie,
    nameDiffers: polity.name !== cms.name,
    wikidataDiffers: wikidataConflict(polity, cms),
    datesDiffer: DATE_FIELDS.filter((field) => {
      const given = cmsDate(cms, field)
      return given !== null && given !== polity[field]
    }),
    missingInCms: DATE_FIELDS.filter(
      (field) => cmsDate(cms, field) === null && polity[field] !== null
    ),
  }
}

/**
 * Whether a tied polity has something to align: its name, its Wikidata item or a date the CMS gives.
 * @param tied - the comparison
 * @returns whether aligning would change it
 */
function isApart(tied: TiedPolity): boolean {
  return tied.nameDiffers || tied.wikidataDiffers || tied.datesDiffer.length > 0
}

/** The four groups, as `alignMap` fills them. */
interface Groups {
  /** {@link MapAlignment.untied}. */
  untied: UntiedPolity[]
  /** {@link MapAlignment.toAlign}. */
  toAlign: TiedPolity[]
  /** {@link MapAlignment.toConfirm}. */
  toConfirm: TiedPolity[]
  /** {@link MapAlignment.toEnterInCms}. */
  toEnterInCms: TiedPolity[]
}

/**
 * Put one polity in its groups.
 * @param polity - the polity
 * @param found - how it is tied, `tieOf`'s
 * @param groups - the groups, filled in place
 */
function place(polity: YearPolity, found: ReturnType<typeof tieOf>, groups: Groups): void {
  if (found === null || found === 'missing') {
    groups.untied.push({
      id: polity.id,
      name: polity.name,
      reason: found === null ? 'none' : 'missing',
      ...(found === 'missing' && polity.territory !== undefined
        ? { territory: polity.territory }
        : {}),
    })
    return
  }
  const tied = compare(polity, found.cms, found.tie)
  if (tied.tie === 'wikidata') {
    groups.toConfirm.push(tied)
    return
  }
  if (isApart(tied)) groups.toAlign.push(tied)
  if (tied.missingInCms.length > 0) groups.toEnterInCms.push(tied)
}

/**
 * Confront a map's polities with the CMS's territories.
 * @param polities - the map's polities
 * @param territories - every territory of the CMS, read live
 * @returns the four groups
 */
export function alignMap(
  polities: readonly YearPolity[],
  territories: readonly ContentTerritory[]
): MapAlignment {
  const byNumber = new Map(territories.map((territory) => [territory.id, territory]))
  const byWikidata = new Map<string, ContentTerritory>()
  for (const territory of territories) {
    if (territory.wikidata !== null) byWikidata.set(territory.wikidata, territory)
  }
  const groups: Groups = { untied: [], toAlign: [], toConfirm: [], toEnterInCms: [] }
  for (const polity of polities) place(polity, tieOf(polity, byNumber, byWikidata), groups)
  return groups
}

/**
 * A polity aligned on its territory: the CMS's French name, its number, its Wikidata item when it has one — so the tie
 * by number and `sameTerritory`'s by item name the same territory — and every date the CMS gives; a date or an item it
 * lacks stays the map's (the dev, 2026-11-27: nothing erased, nothing invented).
 * @param polity - the polity
 * @param cms - its territory
 * @returns the polity aligned, a new object
 */
export function alignedPolity(polity: YearPolity, cms: ContentTerritory): YearPolity {
  return {
    ...polity,
    name: cms.name,
    territory: cms.id,
    wikidata: cms.wikidata ?? polity.wikidata,
    existsFrom: cmsDate(cms, 'existsFrom') ?? polity.existsFrom,
    existsTo: cmsDate(cms, 'existsTo') ?? polity.existsTo,
  }
}

/** Which of a polity's fields the CMS holds, and the Cartographer shows read-only. */
export interface CmsLocks {
  /** Its name. */
  readonly name: boolean
  /** Its beginning. */
  readonly existsFrom: boolean
  /** Its end. */
  readonly existsTo: boolean
}

/** Nothing locked — a polity new, or tied by no number. */
export const NO_CMS_LOCKS: CmsLocks = { name: false, existsFrom: false, existsTo: false }

/**
 * Whether a field of the polity's form is one the CMS may hold — the keys of {@link CmsLocks}, written once.
 * @param field - the field
 * @returns whether it is the name or a date
 */
export function isCmsLockable(field: string): field is keyof CmsLocks {
  return Object.hasOwn(NO_CMS_LOCKS, field)
}

/**
 * What an aligned polity's form locks: only for a polity tied by its number to a territory whose Wikidata item does
 * not contradict its own, and only the fields that are the CMS's — a name or a date not yet aligned stays editable, and
 * so does a date the CMS lacks.
 * @param polity - the polity, as the map holds it
 * @param territories - every territory of the CMS
 * @returns the fields locked
 */
export function cmsLocks(
  polity: Pick<YearPolity, 'name' | 'existsFrom' | 'existsTo' | 'territory' | 'wikidata'>,
  territories: readonly ContentTerritory[]
): CmsLocks {
  if (polity.territory === undefined) return NO_CMS_LOCKS
  const cms = territories.find((territory) => territory.id === polity.territory)
  if (cms === undefined || wikidataConflict(polity, cms)) return NO_CMS_LOCKS
  const held = (field: DateField): boolean => {
    const given = cmsDate(cms, field)
    return given !== null && given === polity[field]
  }
  return {
    name: polity.name === cms.name,
    existsFrom: held('existsFrom'),
    existsTo: held('existsTo'),
  }
}
