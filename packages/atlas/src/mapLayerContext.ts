/**
 * What the map's layers are, and what they are drawn from.
 *
 * Split out of `mapLayers` so the builders and the handle can share it without either importing the
 * other: this holds the state and the few helpers every rebuild needs, and nothing that draws.
 */

import { shorelineMask } from './mapSources'
import { createDrapeProjection } from './scene/drapeProjection'

import type { DevState } from './devState'
import type { MapSources } from './mapSources'
import type { CompassRose } from './scene/compassRose'
import type { ComposedLineLayer } from './scene/composedLineLayer'
import type { DrapeProjection } from './scene/drapeProjection'
import type { FrameLabels } from './scene/frameLabels'
import type { GraticuleFrame } from './scene/graticuleFrame'
import type { LineLayer } from './scene/lineLayer'
import type { MapEdge } from './scene/mapEdge'
import type { MapTitle } from './scene/mapTitle'
import type { PaperSheet } from './scene/paperSheet'
import type { RiverLayer } from './scene/riverLayer'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'
import type { DataTexture, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Scene } from 'three'

/** World-space width of the map plane on X, which every other dimension follows from. */
export const WORLD_WIDTH = 12

/**
 * Lift applied to draped lines before the exaggeration scale, so they clear the terrain they sit on
 * instead of z-fighting with it. Scaled down with the relief, hence deliberately generous.
 */
export const RIVER_LIFT = 0.004

/**
 * Draw order of the political line work. It only matters once `borderOnTop` switches depth testing off:
 * with no depth to arbitrate, this is the sole thing keeping a core stroke above its own edging.
 */
export const BORDER_RENDER_ORDER = 10

/** The relief mesh, whose material carries the baked terrain texture. */
export type ReliefMesh = Mesh<PlaneGeometry, MeshBasicMaterial>

/** Every layer currently on screen, or `null` where one has not been built yet. */
export interface LayerHandles {
  /** The terrain itself. */
  relief: ReliefMesh | null
  /** The wall around its edge, which makes it a slab rather than a surface. */
  edge: MapEdge | null
  /** The baked look hanging on it, managed apart from the mesh: a retune is a texture swap, not a rebuild. */
  texture: DataTexture | null
  /** The drawn shoreline. */
  coastline: LineLayer | null
  /** The portolan rhumb web. */
  rhumb: LineLayer | null
  /** The river network. */
  rivers: RiverLayer | null
  /** The political line work — frontier, casing and core — behind one handle like any other overlay. */
  borders: ComposedLineLayer | null
  /** The compass rose. */
  compass: CompassRose | null
  /** The vellum the map is printed on. */
  sheet: PaperSheet | null
  /** The graduated border between the map and its margin. */
  frame: GraticuleFrame | null
  /** The degrees written in the margin, or `null` when the frame carries none. */
  labels: FrameLabels | null
  /** The atlas's name, printed in the margin below the map. */
  title: MapTitle | null
  /** The sheet's baked vellum, managed apart from the mesh it hangs on. */
  sheetTexture: DataTexture | null
}

/** What the layers read and draw into. */
export interface MapLayersDeps {
  /** The scene every layer is added to. */
  scene: Scene
  /** The live tunables. */
  dev: DevState
  /** What has been loaded so far. */
  sources: MapSources
}

/** The layers plus the things they need, passed to every builder instead of captured in a closure. */
export interface LayerContext extends MapLayersDeps {
  /** How a grid coordinate becomes a world position, flat or draped. */
  projection: DrapeProjection
  /** The live handles, mutated in place as layers are rebuilt. */
  handles: LayerHandles
}

/**
 * Remove a layer from the scene and free its GPU resources.
 *
 * `scene.remove` alone leaks: the geometry and the material stay on the GPU with nothing referencing
 * them, which is invisible until a few hundred rebuilds in.
 * @param scene - the scene it was added to
 * @param handle - the layer, or `null`
 * @returns nothing
 */
export function disposeHandle(
  scene: Scene,
  handle: { object: Object3D; dispose: () => void } | null
): void {
  if (!handle) return
  scene.remove(handle.object)
  handle.dispose()
}

/**
 * Remove the relief mesh and free it.
 *
 * Its material is disposed separately from its texture on purpose: `Material.dispose` leaves `map`
 * alone, and the texture outlives any one mesh.
 * @param scene - the scene it was added to
 * @param relief - the mesh, or `null`
 * @returns nothing
 */
export function disposeRelief(scene: Scene, relief: ReliefMesh | null): void {
  if (!relief) return
  scene.remove(relief)
  relief.geometry.dispose()
  relief.material.dispose()
}

/**
 * Build the projection every overlay is drawn through.
 *
 * Accessors rather than values: the grid reloads and the height curve is dragged live, so a projection
 * built from a snapshot would quietly stop matching the terrain.
 * @param dev - the live tunables
 * @param sources - what has been loaded
 * @returns the projection
 */
export function createLayerProjection(dev: DevState, sources: MapSources): DrapeProjection {
  return createDrapeProjection({
    worldWidth: WORLD_WIDTH,
    segments: () => dev.relief.segments,
    frame: () => sources.heightmap?.meta ?? null,
    source: () => sources.reliefSource,
    curve: () => ({ plainsCeiling: dev.relief.plainsCeiling, peakTarget: dev.relief.peakTarget }),
    flatLift: () => dev.coast.yLift,
    shoreLift: () => dev.coast.shoreLift,
    drapedLift: RIVER_LIFT,
  })
}

/**
 * The land mask, or the documented degraded fallback when the asset failed — see {@link shorelineMask}.
 * @param context - the layers and what they read
 * @returns a mask, always
 */
export function maskOrFallback(context: LayerContext): LandMask {
  const mask = shorelineMask(context.sources, context.dev.texture.seaLevel)
  if (!mask) throw new Error('map layers: no elevation to threshold')
  return mask
}
