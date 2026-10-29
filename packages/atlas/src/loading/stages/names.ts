/**
 * A year's country names (ATLAS-301, step 3b of `files/plans/atlas/country-names.md`): asked once the year is on
 * screen, placed by the names' own worker, laid on the relief when they come back. The map never waits for them —
 * placing every level takes seconds — and the progress bar does not carry them.
 */

import { homageLevels } from '@europe-historical-atlas/core/editor/homageLevels'
import { bearersByLevel } from '@europe-historical-atlas/core/editor/regionBearers'

import { charactersOf, drawNameSheet } from '../../scene/political/names/glyphSheet'
import { NAME_FACE_URL, NAME_FAMILY } from '../../scene/political/names/nameFace'

import type { NameDevParams } from '../../tunables/params'
import type { PipelineContext } from '../pipelineContext'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { NamePlacementOptions } from '@europe-historical-atlas/core/pipeline/namePlacement'
import type { GlyphMetric } from '@europe-historical-atlas/core/pipeline/yearNames'

/** The names' grid, in cells across — about 6 km a cell over the map's width, as on the bench. */
export const NAME_GRID_WIDTH = 1200

/**
 * The titles a formal name opens with, cut to their initials to make the short name the map writes where the formal one
 * does not fit — « Kingdom of France » becomes « K. of France » (the dev, 2026-10-29). **Provisional**: the short name
 * per language, entered in the Cartographer, is step 4 of the plan.
 */
const TITLE =
  /^((?:\p{Lu}[\p{L}'-]* )*?)((?:Grand |Palatine )?(?:Kingdom|Principality|Duchy|County|Republic|Lordship|Emirate|Caliphate|Imamate|Khanate|Sultanate|Margraviate|March|Despotate|Archbishopric|Bishopric|Empire|Barony|City|Dominions|Confederacy|Land|Lands|Realm)) of /u

/**
 * The short name the map writes for a formal one, provisionally: its title cut to initials, the dynasty before it kept —
 * the dev's reading of 2026-10-29. A name with no title before its « of » — a people, « Roman Empire » — is short
 * already, and stays whole.
 * @param formal - the registry's name
 * @returns « K. of France » for « Kingdom of France », « Zirid E. of Ifriqiya » for « Zirid Emirate of Ifriqiya »; the
 *   name itself when it has no title before an « of »
 */
export function provisionalShortName(formal: string): string {
  return formal.replace(TITLE, (_, dynasty: string, title: string) => {
    const initials = title.split(' ').map((word) => `${word.charAt(0)}.`)
    return `${dynasty}${initials.join(' ')} of `
  })
}

/**
 * How the names are placed, from the panel's settings.
 * @param params - the names' settings
 * @returns the placement's options
 */
export function namePlacement(params: NameDevParams): NamePlacementOptions {
  return {
    margin: params.margin,
    overflow: params.overflow,
    neighbourBite: params.neighbourBite,
    longMinSize: params.longMinSize,
    minSize: params.minSize,
    maxSize: params.maxSize,
    weights: {
      size: params.weightSize,
      centre: params.weightCentre,
      cover: params.weightCover,
      bend: params.weightBend,
      slant: params.weightSlant,
      border: params.weightBorder,
      twoLines: params.weightTwoLines,
    },
  }
}

/** A year's names as the map writes them, every form, by polity id. */
interface WrittenNames {
  /** The short names — the formal ones with their title cut to initials, for now. */
  readonly short: Record<string, string>
  /** The full names — the registry's own. */
  readonly full: Record<string, string>
}

/**
 * Each polity's name as the map writes it, short and full, in capitals when the panel says so.
 * @param polities - the year's polities
 * @param params - the names' settings
 * @returns the names, by polity id
 */
function writtenNames(
  polities: readonly { id: string; name: string }[],
  params: NameDevParams
): WrittenNames {
  const written = (text: string): string => (params.capitals ? text.toLocaleUpperCase('en') : text)
  return {
    short: Object.fromEntries(
      polities.map(({ id, name }) => [id, written(provisionalShortName(name))])
    ),
    full: Object.fromEntries(polities.map(({ id, name }) => [id, written(name)])),
  }
}

/**
 * The letters' measures with the panel's letter spacing added to every advance — one spacing for every name.
 * @param glyphs - the letters as measured
 * @param tracking - the spacing, in ems
 * @returns the measures the placement reads
 */
function tracked(
  glyphs: Record<string, GlyphMetric>,
  tracking: number
): Record<string, GlyphMetric> {
  return Object.fromEntries(
    Object.entries(glyphs).map(([character, metric]) => [
      character,
      { ...metric, advance: metric.advance + tracking },
    ])
  )
}

/**
 * Load the names' face once for the pipeline's life, so the letters are measured in it and never in a fallback.
 * @param context - the pipeline's world, which keeps the load
 * @returns once the face can be drawn with
 */
function nameFace(context: PipelineContext): Promise<void> {
  context.nameFace ??= new FontFace(NAME_FAMILY, `url(${NAME_FACE_URL})`)
    .load()
    .then((face) => {
      document.fonts.add(face)
    })
    .catch((error: unknown) => {
      // A failed load is not kept: the next request for the names — another year, the panel — loads it again.
      context.nameFace = null
      throw error
    })
  return context.nameFace
}

/**
 * Each region's polity id, in the regions' order.
 * @param loaded - the year
 * @returns the ids
 * @throws when an authored region carries none — the adapter gives every one its id, so a miss is a defect
 */
function regionPolities(loaded: RegionSet): string[] {
  return loaded.regions.map(({ polityId }) => {
    if (polityId === undefined) throw new Error('[atlas] an authored region carries no polity id')
    return polityId
  })
}

/**
 * The sheet every form's letters are cut from, and their measures.
 * @param names - the names, every form
 * @returns the sheet and the measured characters
 */
function sheetOf(names: WrittenNames): ReturnType<typeof drawNameSheet> {
  const texts = [names.short, names.full].flatMap((form) => Object.values(form))
  return drawNameSheet(charactersOf(texts), NAME_FAMILY, {
    letters: document.createElement('canvas'),
    halo: document.createElement('canvas'),
  })
}

/**
 * Ask for a year's names, and lay them on the map when they come back — unless the year has changed meanwhile.
 *
 * Only an authored year is named: a year read from the per-century payloads knows no polity by id, and its names
 * would be the payload's, which no one wrote for this map. Said once in the console.
 * @param context - the pipeline's world
 * @param loaded - the year now on screen
 * @returns once the names are on the map, or have been given up
 */
export async function rebuildYearNames(context: PipelineContext, loaded: RegionSet): Promise<void> {
  const { sources, layers, dev } = context
  // A newer request — another year, or the panel again — supersedes this one.
  const isCurrent = context.namesGate.begin()
  // The last year's names come off at once: they name ground that is no longer theirs.
  sources.yearNames = null
  layers.rebuildNames()
  const authored = loaded.authored
  const heightmap = sources.heightmap
  if (authored === undefined || heightmap === null) {
    console.warn(
      `[atlas] ${String(loaded.year)} is not an authored year: its countries are not named.`
    )
    return
  }
  try {
    await nameFace(context)
    if (context.isDisposed() || !isCurrent()) return
    const names = writtenNames(authored.year.registry.polities, dev.names)
    const { sheet, glyphs } = sheetOf(names)
    const gridHeight = Math.round((NAME_GRID_WIDTH * heightmap.meta.height) / heightmap.meta.width)
    const placed = await context.box.names.placeYearNames({
      regions: loaded.regions,
      bearersByLevel: bearersByLevel(
        regionPolities(loaded),
        homageLevels(authored.year.registry.polities)
      ),
      names: names.short,
      fullNames: names.full,
      glyphs: tracked(glyphs, dev.names.tracking),
      gridWidth: NAME_GRID_WIDTH,
      gridHeight,
      options: namePlacement(dev.names),
    })
    if (context.isDisposed() || !isCurrent()) return
    if (placed.unnamed.length > 0)
      console.warn(`[atlas] ${String(placed.unnamed.length)} countries have no name to write.`)
    sources.yearNames = placed
    sources.nameSheet = sheet
    layers.rebuildNames()
  } catch (error: unknown) {
    // The map stands without its names; the console says why (to settle with the dev: a notice on screen?).
    console.error('[atlas] the countries’ names could not be placed', error)
  }
}
