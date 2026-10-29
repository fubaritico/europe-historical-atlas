/**
 * A year's country names (ATLAS-301, step 3b of `files/plans/atlas/country-names.md`): asked once the year is on
 * screen, placed by the names' own worker, laid on the relief when they come back. The map never waits for them —
 * placing every level takes seconds — and the progress bar does not carry them.
 */

import { shortNameOf } from '@europe-historical-atlas/core/data/shortName'
import { homageLevels } from '@europe-historical-atlas/core/editor/homageLevels'
import { bearersByLevel } from '@europe-historical-atlas/core/editor/regionBearers'
import { NAME_GRID_WIDTH } from '@europe-historical-atlas/core/pipeline/yearNames'

import { charactersOf, drawNameSheet } from '../../scene/political/names/glyphSheet'
import { NAME_FACE_URL, NAME_FAMILY } from '../../scene/political/names/nameFace'
import { namePlacement } from '../../tunables/params'

import type { NameDevParams } from '../../tunables/params'
import type { PipelineContext } from '../pipelineContext'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

/** A year's names as the map writes them, every form, by polity id. */
interface WrittenNames {
  /** The short names — the registry's own, or the formal one without its title where it has none (CARTO-307). */
  readonly short: Record<string, string>
  /** The full names — the registry's own. */
  readonly full: Record<string, string>
}

/** What a polity gives the names: its id, its formal name, and the short one its author entered, if any. */
interface NamedPolity {
  /** Its id. */
  readonly id: string
  /** Its formal name, the registry's. */
  readonly name: string
  /** The name the map writes where the full one does not fit (CARTO-307); absent when none was entered. */
  readonly shortName?: string
}

/**
 * Each polity's name as the map writes it, short and full, as it is written — in capitals only when the panel says so.
 * @param polities - the year's polities
 * @param params - the names' settings
 * @returns the names, by polity id
 */
function writtenNames(polities: readonly NamedPolity[], params: NameDevParams): WrittenNames {
  const written = (text: string): string => (params.capitals ? text.toLocaleUpperCase('en') : text)
  return {
    short: Object.fromEntries(polities.map((polity) => [polity.id, written(shortNameOf(polity))])),
    full: Object.fromEntries(polities.map(({ id, name }) => [id, written(name)])),
  }
}

/**
 * What the console says of the polities with no short name entered (CARTO-307, the dev, 2026-10-29: *« un pays sans
 * nom court est signalé par la console »*): the map writes their formal name without its title instead. Said once a
 * placement, as {@link unplacedNote}.
 * @param polities - the year's polities
 * @returns the warning, the polities by their formal name, in the registry's order; `null` when each has its short
 *   name
 */
export function unshortenedNote(polities: readonly NamedPolity[]): string | null {
  const bare = polities.filter(({ shortName }) => shortName === undefined).map(({ name }) => name)
  if (bare.length === 0) return null
  return `[atlas] ${String(bare.length)} countries have no short name — the map writes their name without its title: ${bare.join(', ')}.`
}

/**
 * What the console says of the countries no level found room to name (ATLAS-310): a refusal is never silent (the
 * dev, 2026-10-11), and a country named nowhere is one the reader cannot find on the map. Said once a placement, never
 * a frame — the names are placed once a year, and again only when the panel moves them.
 * @param placed - the year's names, every level
 * @param polities - the year's registry, for the names said
 * @returns the warning, the countries by their registry name, each once, in the registry's order; `null` when every
 *   country shown is named somewhere
 */
export function unplacedNote(
  placed: Pick<YearNames, 'levels'>,
  polities: readonly { readonly id: string; readonly name: string }[]
): string | null {
  const refused = new Set(placed.levels.flatMap(({ tooSmall }) => tooSmall))
  // The levels' owners are the registry's polities (`bearersByLevel`), so each refused id has its name there.
  const listed = polities.filter(({ id }) => refused.has(id)).map(({ name }) => name)
  if (listed.length === 0) return null
  return `[atlas] No room for the name of ${String(listed.length)} countries, at one level at least: ${listed.join(', ')}.`
}

/**
 * Say in the console, once a placement, every country the map writes short of its own: with no name at all, with no
 * short name entered, or with no room for its name.
 * @param placed - the year's names, every level
 * @param polities - the year's registry
 */
function sayWhatIsMissing(placed: YearNames, polities: readonly NamedPolity[]): void {
  if (placed.unnamed.length > 0)
    console.warn(`[atlas] ${String(placed.unnamed.length)} countries have no name to write.`)
  for (const note of [unshortenedNote(polities), unplacedNote(placed, polities)])
    if (note !== null) console.warn(note)
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
      glyphs,
      gridWidth: NAME_GRID_WIDTH,
      gridHeight,
      options: namePlacement(dev.names),
    })
    if (context.isDisposed() || !isCurrent()) return
    sayWhatIsMissing(placed, authored.year.registry.polities)
    sources.yearNames = placed
    sources.nameSheet = sheet
    layers.rebuildNames()
  } catch (error: unknown) {
    // The map stands without its names; the console says why (to settle with the dev: a notice on screen?).
    console.error('[atlas] the countries’ names could not be placed', error)
  }
}
