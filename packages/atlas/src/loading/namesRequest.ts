/**
 * What a year's names are placed from — the request `placeYearNames` takes — built the one way for the page and for the
 * site's build (ATLAS-333): the names placed ahead of the visit are the names the page would place, from the same
 * regions, bearers, written names and settings. Pure: no page, no font, no worker; the letters' measures are handed in.
 */

import { homageLevels } from '@europe-historical-atlas/core/data/homageLevels'
import { fullNameOf, shortNameOf } from '@europe-historical-atlas/core/data/shortName'
import { bearersByLevel } from '@europe-historical-atlas/core/editor/regionBearers'
import { LEADER_DOT } from '@europe-historical-atlas/core/pipeline/nameOffset'
import { NAME_GRID_WIDTH } from '@europe-historical-atlas/core/pipeline/yearNames'

import { charactersOf } from '../scene/political/names/glyphSheet'
import { namePlacement } from '../tunables/params'

import type { NameDevParams } from '../tunables/params'
import type { HeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type {
  GlyphMetric,
  YearNamesRequest,
} from '@europe-historical-atlas/core/pipeline/yearNames'

/** A year's names as the map writes them, every form, by polity id. */
export interface WrittenNames {
  /** The short names — the registry's own, or the formal one without its title where it has none (CARTO-307). */
  readonly short: Record<string, string>
  /** The full names — the registry's own; none for a polity whose short name is forced. */
  readonly full: Record<string, string>
}

/** What a polity gives the names: its id, its formal name, and the short one its author entered, if any. */
export interface NamedPolity {
  /** Its id. */
  readonly id: string
  /** Its formal name, the registry's. */
  readonly name: string
  /** The name the map writes where the full one does not fit (CARTO-307); absent when none was entered. */
  readonly shortName?: string
  /** Whether its short name is written everywhere, even where the full one fits; absent when not. */
  readonly forceShortName?: true
}

/**
 * Each polity's name as the map writes it, short and full, as it is written — in capitals only when the panel says so.
 * @param polities - the year's polities
 * @param params - the names' settings
 * @returns the names, by polity id
 */
export function writtenNames(
  polities: readonly NamedPolity[],
  params: NameDevParams
): WrittenNames {
  const written = (text: string): string => (params.capitals ? text.toLocaleUpperCase('en') : text)
  return {
    short: Object.fromEntries(polities.map((polity) => [polity.id, written(shortNameOf(polity))])),
    full: Object.fromEntries(
      polities.flatMap((polity) => {
        const full = fullNameOf(polity)
        return full === null ? [] : [[polity.id, written(full)]]
      })
    ),
  }
}

/**
 * The characters a year's names need measured: every form of every name, and the leader's dot (ATLAS-315) — the one
 * list the page draws its sheet from and the build measures in the face's file, so both place from the same letters.
 * @param names - the names, every form
 * @returns their characters, each once
 */
export function charactersToMeasure(names: WrittenNames): string[] {
  return charactersOf(
    [names.short, names.full].flatMap((form) => Object.values(form)).concat(LEADER_DOT)
  )
}

/**
 * Each region's polity, in the regions' order.
 * @param loaded - an authored year's regions
 * @returns their polities' ids
 * @throws when a region carries no polity id — an authored region always does, so a miss is a defect
 */
function regionPolities(loaded: RegionSet): string[] {
  return loaded.regions.map(({ polityId }) => {
    if (polityId === undefined) throw new Error('[atlas] an authored region carries no polity id')
    return polityId
  })
}

/** What the request is built from. */
export interface NamesInputs {
  /** The year's regions, its authored files beside them. */
  readonly loaded: RegionSet & { readonly authored: NonNullable<RegionSet['authored']> }
  /** The names as written, from {@link writtenNames}. */
  readonly names: WrittenNames
  /** Every character of the names, measured in the names' face. */
  readonly glyphs: Readonly<Record<string, GlyphMetric>>
  /** The relief's frame, whose proportions the names' grid keeps. */
  readonly meta: Pick<HeightmapMeta, 'width' | 'height'>
  /** The names' settings. */
  readonly params: NameDevParams
}

/**
 * The request for a year's names.
 * @param inputs - the year, its written names, the letters' measures, the relief's frame and the names' settings
 * @returns the request `placeYearNames` takes
 */
export function yearNamesRequest(inputs: NamesInputs): YearNamesRequest {
  const { loaded, names, glyphs, meta, params } = inputs
  return {
    regions: loaded.regions,
    bearersByLevel: bearersByLevel(
      regionPolities(loaded),
      homageLevels(loaded.authored.year.registry.polities)
    ),
    names: names.short,
    fullNames: names.full,
    glyphs,
    gridWidth: NAME_GRID_WIDTH,
    gridHeight: Math.round((NAME_GRID_WIDTH * meta.height) / meta.width),
    options: namePlacement(params),
  }
}
