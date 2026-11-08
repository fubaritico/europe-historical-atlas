/**
 * A year's country names (ATLAS-301, step 3b of `files/plans/atlas/country-names.md`): asked once the year is on
 * screen, placed by the names' own worker, laid on the relief when they come back. The map never waits for them —
 * placing every level takes seconds — and the progress bar does not carry them.
 */

import { drawNameSheet } from '../../scene/political/names/glyphSheet'
import { NAME_FACE_URL, NAME_FAMILY } from '../../scene/political/names/nameFace'
import { namesKey } from '../nameCache'
import { charactersToMeasure, writtenNames, yearNamesRequest } from '../namesRequest'

import type { CachedNames } from '../nameCache'
import type { NamedPolity, WrittenNames } from '../namesRequest'
import type { PipelineContext } from '../pipelineContext'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

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
 * The sheet every form's letters are cut from, and their measures — the leader's dot with them (ATLAS-315).
 * @param names - the names, every form
 * @returns the sheet and the measured characters
 */
function sheetOf(names: WrittenNames): ReturnType<typeof drawNameSheet> {
  return drawNameSheet(charactersToMeasure(names), NAME_FAMILY, {
    letters: document.createElement('canvas'),
    halo: document.createElement('canvas'),
  })
}

/**
 * Lay the names already placed from this very year content and these settings, if there are some (ATLAS-333).
 * @param context - the pipeline's world
 * @param key - the year's key in the cache
 * @returns `true` when they were there and are on the map
 */
function layKeptNames(context: PipelineContext, key: string): boolean {
  const kept = context.nameCache.get(key)
  if (kept === undefined) return false
  layNames(context, kept)
  return true
}

/**
 * Lay a year's names on the map — placed just now, or kept from before.
 * @param context - the pipeline's world
 * @param names - the placement and its sheet
 */
function layNames(context: PipelineContext, names: CachedNames): void {
  context.sources.yearNames = names.placed
  context.sources.nameSheet = names.sheet
  context.layers.rebuildNames()
}

/** What placing a year's names needs once it is known to be an authored year with a relief under it. */
interface Placement {
  /** The authored year. */
  readonly authored: NonNullable<RegionSet['authored']>
  /** Its key in the cache. */
  readonly key: string
  /** The relief, whose frame sizes the names' grid. */
  readonly heightmap: NonNullable<PipelineContext['sources']['heightmap']>
  /** Whether this request is still the newest. */
  readonly isCurrent: () => boolean
}

/**
 * A year's names as the build placed them (ATLAS-333), when they are the ones the page would place now: the build's
 * key is the page's for this year and these settings. Otherwise `null`, and the page places them itself — the names
 * come seconds later, never wrong — said once in the console: a warning when none is baked (the dev server, a year
 * added since the build) or baked for another version of the year or other settings, an error when the file cannot be
 * read.
 * @param context - the pipeline's world
 * @param year - the year
 * @param key - the page's key for its names
 * @returns the names, or `null` to place them here
 */
async function bakedNamesFor(
  context: PipelineContext,
  year: number,
  key: string
): Promise<YearNames | null> {
  try {
    const baked = await context.assets.bakedNames.load(year)
    if (baked === null) {
      console.warn(`[atlas] ${String(year)}: no names placed at the build — placed here.`)
      return null
    }
    if (baked.key !== key) {
      console.warn(
        `[atlas] ${String(year)}: the names placed at the build are for another version of the year or other settings — placed here.`
      )
      return null
    }
    return baked.names
  } catch (error: unknown) {
    // A file the build wrote wrong, or the transport broke: a defect, so an error — in the console only, not on screen,
    // the reader still gets the names (the dev, 2026-11-08: « juste un console error »).
    console.error(
      `[atlas] ${String(year)}: the names placed at the build cannot be read — placed here.`,
      error
    )
    return null
  }
}

/**
 * A year's names and their sheet — from the build when it placed them for this key, else placed in their worker — kept
 * in the names' cache under the key, even when overtaken: the placement is right for its key, and the reader may come
 * to that year.
 * @param context - the pipeline's world
 * @param loaded - the year
 * @param placement - the authored year, its key, the relief, the gate
 * @returns the names and their sheet; `null` when torn down or overtaken before they were placed
 * @throws what the placement throws
 */
async function namesOf(
  context: PipelineContext,
  loaded: RegionSet,
  placement: Placement
): Promise<CachedNames | null> {
  const { dev } = context
  const { authored, key, heightmap, isCurrent } = placement
  const fromBuild = bakedNamesFor(context, loaded.year, key)
  await nameFace(context)
  if (context.isDisposed() || !isCurrent()) return null
  const names = writtenNames(authored.year.registry.polities, dev.names)
  const { sheet, glyphs } = sheetOf(names)
  const placed =
    (await fromBuild) ??
    (await context.box.names.placeYearNames(
      yearNamesRequest({
        loaded: { ...loaded, authored },
        names,
        glyphs,
        meta: heightmap.meta,
        params: dev.names,
      })
    ))
  const cached = { placed, sheet }
  context.nameCache.set(key, cached)
  return cached
}

/**
 * Place a year's names ahead, into the names' cache, without laying them (ATLAS-333, the maps prepared around the one
 * shown): the year, once shown, lays them from the cache at once.
 * @param context - the pipeline's world
 * @param loaded - the year prepared
 * @param isCurrent - whether the preparation is still wanted
 * @returns once they are in the cache, or nothing is to be placed
 * @throws what the placement throws — the caller says it; the year shown then places them as it always did
 */
export async function warmYearNames(
  context: PipelineContext,
  loaded: RegionSet,
  isCurrent: () => boolean
): Promise<void> {
  const authored = loaded.authored
  const heightmap = context.sources.heightmap
  const key = cacheKeyOf(context, loaded)
  if (authored === undefined || heightmap === null || key === null) return
  if (context.nameCache.get(key) !== undefined) return
  await namesOf(context, loaded, { authored, key, heightmap, isCurrent })
}

/**
 * A year's key in the names' cache, under the settings of now.
 * @param context - the pipeline's world
 * @param loaded - the year
 * @returns the key; `null` for a year not authored, or with no relief in yet — it is never named
 */
function cacheKeyOf(context: PipelineContext, loaded: RegionSet): string | null {
  const authored = loaded.authored
  const heightmap = context.sources.heightmap
  if (authored === undefined || heightmap === null) return null
  return namesKey(authored.year, {
    names: context.dev.names,
    bbox: authored.bbox,
    grid: heightmap.meta,
  })
}

/**
 * Lay the names placed ahead for the year the sources hold now (ATLAS-333) — a map prepared in the background, so it is
 * set aside with its names and comes back with them: building their layer cost ~150 ms on its first showing (measured
 * on the built site, 2026-11-08).
 * @param context - the pipeline's world
 * @param loaded - the year being laid
 * @returns `true` when they were in the cache and are laid; `false` leaves the year to place them when shown
 */
export function layWarmNames(context: PipelineContext, loaded: RegionSet): boolean {
  const key = cacheKeyOf(context, loaded)
  return key !== null && layKeptNames(context, key)
}

/**
 * Place a year's names in their worker, keep them, and lay them on the map unless a newer request came meanwhile.
 * The names the build placed are laid instead when they are this year's (`bakedNamesFor`), read while the face loads.
 * @param context - the pipeline's world
 * @param loaded - the year
 * @param placement - the authored year, its key, the relief, the gate
 * @returns once the names are on the map, or have been given up
 */
async function placeNames(
  context: PipelineContext,
  loaded: RegionSet,
  placement: Placement
): Promise<void> {
  const { authored, isCurrent } = placement
  try {
    const cached = await namesOf(context, loaded, placement)
    if (cached === null || context.isDisposed() || !isCurrent()) return
    sayWhatIsMissing(cached.placed, authored.year.registry.polities)
    layNames(context, cached)
  } catch (error: unknown) {
    // The map stands without its names; the console says why (to settle with the dev: a notice on screen?).
    console.error('[atlas] the countries’ names could not be placed', error)
  }
}

/**
 * Ask for a year's names, and lay them on the map when they come back — unless the year has changed meanwhile.
 * A year named before from the same content and settings is laid at once, from the cache.
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
  const authored = loaded.authored
  const heightmap = sources.heightmap
  const key =
    authored === undefined
      ? null
      : namesKey(authored.year, { names: dev.names, bbox: authored.bbox, grid: heightmap?.meta })
  if (key !== null && layKeptNames(context, key)) return
  // The last year's names come off at once: they name ground that is no longer theirs.
  sources.yearNames = null
  layers.rebuildNames()
  if (authored === undefined || key === null || heightmap === null) {
    console.warn(
      `[atlas] ${String(loaded.year)} is not an authored year: its countries are not named.`
    )
    return
  }
  await placeNames(context, loaded, { authored, key, heightmap, isCurrent })
}
