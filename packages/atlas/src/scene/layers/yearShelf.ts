/**
 * The years set aside (ATLAS-333, the dev, 2026-11-08: *« il faut un système de cache »* — the slider of the
 * synchronoptic frieze). Leaving a year used to throw its countries, borders, tribes and names away, and coming back
 * built them all again (~1 s on 1100). Now a year left is **set aside whole** — its data and its layers, taken off the
 * scene but kept on the GPU — and coming back puts it back in one frame.
 *
 * **Only what was built under the same settings comes back**: each year is set aside with a stamp — the settings and
 * the relief and texture it was built against (`yearStamp`). A year whose stamp is no longer the map's is never shown:
 * it is freed, and the year is built again.
 *
 * **Bounded**: a year costs tens of megabytes of GPU memory, and many maps are meant (centuries and emblematic years).
 * The window of maps around the one shown is kept (`keepOnly`, the dev's video buffer); past its capacity, a ceiling
 * under that, the shelf frees the year left longest ago.
 */

import type { LayerHandles } from './layerContext'
import type { MapSources } from '../../sources/mapSources'
import type { DevState } from '../../tunables/devState'
import type { Object3D, Scene } from 'three'

/** What a year leaves in the map's sources — everything read for it alone. */
type YearSourceKey =
  | 'regionSet'
  | 'regionTints'
  | 'tintLevels'
  | 'homageDepth'
  | 'bandDepths'
  | 'derivedBorders'
  | 'borderPatterns'
  | 'borderLevels'
  | 'tribes'
  | 'yearNames'
  | 'nameSheet'

/**
 * The layers a year draws — each one built for it alone. The events with them (66 ms to build again on a return,
 * measured 2026-11-08): they are the year's. The contribution they read — events, cities — lands beside the map, so a
 * year left before it is set aside with none; the map pins them when that year comes back (`restoreYear`).
 */
const YEAR_LAYERS = [
  'fills',
  'tribes',
  'borders',
  'names',
  'events',
] as const satisfies readonly (keyof LayerHandles)[]

/** A year's own sources. */
type YearSources = Pick<MapSources, YearSourceKey>

/** A year's own layers. */
type YearLayers = Pick<LayerHandles, (typeof YEAR_LAYERS)[number]>

/** A year set aside. */
interface ShelvedYear {
  /** The settings and the relief it was built under. */
  readonly stamp: string
  /** Its sources, as they were when it was left. */
  readonly sources: YearSources
  /** Its layers, off the scene, still on the GPU. */
  readonly layers: YearLayers
}

/** What the shelf works on. */
export interface YearShelfDeps {
  /** The scene the layers are taken off and put back on. */
  readonly scene: Scene
  /** The map's sources, whose year fields are moved. */
  readonly sources: MapSources
  /** The layers on screen, whose year handles are moved. */
  readonly handles: LayerHandles
  /** How many years are kept aside, at least one. */
  readonly capacity: number
}

/** The years set aside. */
export interface YearShelf {
  /**
   * Set the year on screen aside: its layers off the scene, kept; its sources and handles emptied, so the next year
   * builds in their place without freeing them.
   * @param year - the year on screen
   * @param stamp - the settings and relief it was built under
   * @throws when none of the year's layers is on screen — there is nothing to set aside
   */
  shelve: (year: number, stamp: string) => void
  /**
   * Put a year back on screen, when it was set aside under this very stamp. The year on screen must have been set aside
   * or freed first.
   * @param year - the year
   * @param stamp - the map's settings and relief now
   * @returns whether it came back; `false` when it was never set aside, or under other settings (then freed)
   */
  restore: (year: number, stamp: string) => boolean
  /**
   * Whether a year is set aside under this stamp.
   * @param year - the year
   * @param stamp - the map's settings and relief now
   * @returns whether {@link YearShelf.restore} would bring it back
   */
  holds: (year: number, stamp: string) => boolean
  /**
   * Free every year set aside but these — the window of maps around the one shown (the dev, 2026-11-08: *"next,
   * previous, a bit like a video player's buffer"*).
   * @param years - the years to keep, if they are aside
   */
  keepOnly: (years: readonly number[]) => void
  /**
   * Free the year layers on screen, whatever is there, and empty the year's sources — a map half laid in the background
   * and failing, taken off before the one shown is put back (review ARCH-004).
   */
  discard: () => void
  /**
   * The objects of a year set aside — what sending it to the GPU unseen draws (ATLAS-396).
   * @param year - the year
   * @returns its layers' objects; none for a year not aside
   */
  objectsOf: (year: number) => Object3D[]
  /** Free every year set aside — at teardown. */
  dispose: () => void
}

/**
 * What a year's layers are built under, as one string: the settings that shape them — the year itself aside — and the
 * very relief mesh and texture they lie on (`objectId`). Over-inclusive on purpose: a setting counted for nothing only
 * costs a rebuild; one forgotten would show a year built under settings no longer the map's.
 * @param dev - the live settings
 * @param ground - the relief mesh and the texture on screen
 * @param ground.relief - the relief mesh, if built
 * @param ground.texture - the texture, if hung
 * @param objectId - a stable number for each object, the same for the same object
 * @returns the stamp
 */
export function yearStamp(
  dev: DevState,
  ground: { relief: object | null; texture: object | null },
  objectId: (object: object | null) => number
): string {
  const { year: _year, ...political } = dev.political
  return JSON.stringify({
    relief: dev.relief,
    texture: dev.texture,
    political,
    vassals: dev.vassals,
    names: dev.names,
    tribes: dev.tribes,
    extent: dev.extent,
    mesh: objectId(ground.relief),
    map: objectId(ground.texture),
  })
}

/**
 * A stable number for each object — the same object, the same number; `0` for none.
 * @returns the numbering
 */
export function createObjectIds(): (object: object | null) => number {
  const ids = new WeakMap<object, number>()
  let next = 1
  return (object) => {
    if (object === null) return 0
    let id = ids.get(object)
    if (id === undefined) {
      id = next++
      ids.set(object, id)
    }
    return id
  }
}

/**
 * Free a year's layers.
 * @param layers - the layers, off the scene
 */
function freeLayers(layers: YearLayers): void {
  for (const key of YEAR_LAYERS) layers[key]?.dispose()
}

/**
 * Take a year's sources out of the map's, leaving them empty.
 * @param sources - the map's sources
 * @returns the year's
 */
function takeSources(sources: MapSources): YearSources {
  const taken: YearSources = {
    regionSet: sources.regionSet,
    regionTints: sources.regionTints,
    tintLevels: sources.tintLevels,
    homageDepth: sources.homageDepth,
    bandDepths: sources.bandDepths,
    derivedBorders: sources.derivedBorders,
    borderPatterns: sources.borderPatterns,
    borderLevels: sources.borderLevels,
    tribes: sources.tribes,
    yearNames: sources.yearNames,
    nameSheet: sources.nameSheet,
  }
  Object.assign(sources, {
    regionSet: null,
    regionTints: null,
    tintLevels: null,
    homageDepth: 0,
    bandDepths: null,
    derivedBorders: null,
    borderPatterns: null,
    borderLevels: null,
    tribes: [],
    yearNames: null,
    nameSheet: null,
  } satisfies YearSources)
  return taken
}

/**
 * Take a year's layers off the scene, kept, leaving their handles empty.
 * @param scene - the scene
 * @param handles - the layers on screen
 * @returns the year's layers
 */
function takeLayers(scene: Scene, handles: LayerHandles): YearLayers {
  const layers: YearLayers = {
    fills: handles.fills,
    tribes: handles.tribes,
    borders: handles.borders,
    names: handles.names,
    events: handles.events,
  }
  for (const key of YEAR_LAYERS) {
    const layer: { object: Object3D } | null = layers[key]
    if (layer !== null) scene.remove(layer.object)
    handles[key] = null
  }
  return layers
}

/**
 * Put a year's layers back on the scene and in their handles.
 * @param scene - the scene
 * @param handles - the layers on screen, empty for this year's
 * @param layers - the year's layers
 */
function putLayers(scene: Scene, handles: LayerHandles, layers: YearLayers): void {
  for (const key of YEAR_LAYERS) {
    const layer: { object: Object3D } | null = layers[key]
    if (layer !== null) scene.add(layer.object)
  }
  Object.assign(handles, layers)
}

/**
 * Refuse to set aside a year with none of its layers on screen: it would replace the year's true layers, already
 * aside, by an empty copy (reviews QUAL-001, ARCH-001) — a caller's defect, said, never filed.
 * @param handles - the layers on screen
 * @param year - the year to set aside
 * @throws when none of the year's layers is on screen
 */
function refuseNothingOnScreen(handles: LayerHandles, year: number): void {
  if (YEAR_LAYERS.every((key) => handles[key] === null)) {
    throw new Error(`[atlas] ${String(year)} set aside with none of its layers on screen`)
  }
}

/**
 * Refuse to put a year back over layers still on screen: they would stay on the GPU with nothing holding them.
 * @param handles - the layers on screen
 * @param year - the year to put back
 * @throws when one of the year's layers is still on screen — set the year aside first
 */
function refuseOverScreen(handles: LayerHandles, year: number): void {
  const onScreen = YEAR_LAYERS.filter((key) => handles[key] !== null)
  if (onScreen.length > 0) {
    throw new Error(
      `[atlas] ${String(year)} put back over layers still on screen (${onScreen.join(', ')}) — set the year aside first`
    )
  }
}

/**
 * The objects of a year's layers, the absent ones left out.
 * @param layers - the year's layers; none for a year not aside
 * @returns their objects
 */
function objectsOfLayers(layers: YearLayers | undefined): Object3D[] {
  const objects: Object3D[] = []
  if (layers === undefined) return objects
  for (const key of YEAR_LAYERS) {
    const layer: { object: Object3D } | null = layers[key]
    if (layer !== null) objects.push(layer.object)
  }
  return objects
}

/**
 * Free a year set aside, if it is.
 * @param shelf - the years set aside
 * @param year - the year
 */
function freeShelved(shelf: Map<number, ShelvedYear>, year: number): void {
  const shelved = shelf.get(year)
  if (shelved === undefined) return
  shelf.delete(year)
  freeLayers(shelved.layers)
}

/**
 * The years set aside, for one map.
 * @param deps - the scene, the sources, the handles and how many years to keep
 * @returns the shelf
 * @throws when the capacity is under one — a shelf that keeps nothing is a caller's defect
 */
export function createYearShelf(deps: YearShelfDeps): YearShelf {
  const { scene, sources, handles, capacity } = deps
  if (!Number.isInteger(capacity) || capacity < 1) {
    throw new Error(
      `[atlas] the year shelf keeps a whole number of at least one year, not ${String(capacity)}`
    )
  }
  // In the order they were left, the one left longest ago first.
  const shelf = new Map<number, ShelvedYear>()

  return {
    shelve(year, stamp) {
      refuseNothingOnScreen(handles, year)
      // A year already aside is replaced by what is on screen now.
      freeShelved(shelf, year)
      shelf.set(year, {
        stamp,
        sources: takeSources(sources),
        layers: takeLayers(scene, handles),
      })
      // Past the capacity, the year left longest ago goes.
      for (const oldest of shelf.keys()) {
        if (shelf.size <= capacity) break
        freeShelved(shelf, oldest)
      }
    },

    restore(year, stamp) {
      const shelved = shelf.get(year)
      if (shelved === undefined) return false
      refuseOverScreen(handles, year)
      shelf.delete(year)
      if (shelved.stamp !== stamp) {
        // Built under other settings or another relief: never shown, freed.
        freeLayers(shelved.layers)
        return false
      }
      Object.assign(sources, shelved.sources)
      putLayers(scene, handles, shelved.layers)
      return true
    },

    holds: (year, stamp) => shelf.get(year)?.stamp === stamp,

    keepOnly(years) {
      for (const year of [...shelf.keys()]) if (!years.includes(year)) freeShelved(shelf, year)
    },

    discard() {
      takeSources(sources)
      freeLayers(takeLayers(scene, handles))
    },

    objectsOf: (year) => objectsOfLayers(shelf.get(year)?.layers),

    dispose() {
      for (const year of [...shelf.keys()]) freeShelved(shelf, year)
    },
  }
}
