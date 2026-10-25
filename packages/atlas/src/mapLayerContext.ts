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
import type { DrapeProjection } from './scene/drapeProjection'
import type { EventMarkers } from './scene/eventMarkers'
import type { FillLayer } from './scene/fillLayer'
import type { FrameLabels } from './scene/frameLabels'
import type { GraticuleFrame } from './scene/graticuleFrame'
import type { LevelledBorderLayer } from './scene/levelledBorderLayer'
import type { LineLayer } from './scene/lineLayer'
import type { MapEdge } from './scene/mapEdge'
import type { MapTitle } from './scene/mapTitle'
import type { PaperSheet } from './scene/paperSheet'
import type { RiverLayer } from './scene/riverLayer'
import type { TribeLayer } from './scene/tribeLayer'
import type { TribePatch } from './tribePatches'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'
import type { DataTexture, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Scene } from 'three'

/** World-space width of the map plane on X, which every other dimension follows from. */
export const WORLD_WIDTH = 12

/**
 * How far (world units) the lines laid on the relief — rivers and borders — are pulled toward the camera,
 * so the surface they sit on does not hide them. Replaced a vertical lift of 0.004 on 2026-10-16: the
 * lift slid them up the screen at an oblique angle, off the colours they bound.
 */
export const DRAPED_DEPTH_BIAS = 0.006

/**
 * Draw order of the political line work. It only matters once `borderOnTop` switches depth testing off:
 * with no depth to arbitrate, this is the sole thing keeping a core stroke above its own edging.
 */
export const BORDER_RENDER_ORDER = 10

/** The relief mesh, whose material carries the baked terrain texture. */
export type ReliefMesh = Mesh<PlaneGeometry, MeshBasicMaterial>

/**
 * What the tribe patches were measured from (`mapTribeLayer`) — compared field by field before measuring again. Everything
 * `tribePatches` reads is in it: the tribes, every region whose ground cuts a spill, the frame, the grid and
 * the land (ARCH-003 / QUAL-007).
 *
 * **The land by what it is made of, not by the mask object**: with the land mask failed, `maskOrFallback`
 * derives a new threshold mask at every call, so its identity never repeats — the land is the mask asset
 * when there is one, else the elevation and the sea level it is thresholded at.
 */
export interface TribeCutKey {
  /** The tribes' rings and colours, by identity — replaced, never mutated, when a year is settled. */
  tribes: object
  /** Every region of the year, by identity. */
  claims: object
  /** The frame the rings were projected against, by value. */
  bounds: GeoBounds
  /** The relief's subdivision. */
  segX: number
  /** The relief's subdivision. */
  segY: number
  /** The land mask asset, or `null` when it failed. */
  landMask: object | null
  /** The elevation the fallback is thresholded over, or `null` before it loads. */
  heightmap: object | null
  /** The fallback's threshold — read only when there is no mask. */
  seaLevel: number
}

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
  /**
   * The political line work — frontier, casing and core — behind one handle like any other overlay, one
   * composed layer per split level of homage inside it.
   */
  borders: LevelledBorderLayer | null
  /** An authored year's polities as geometry on the relief, or `null` when the texture carries them. */
  fills: FillLayer | null
  /**
   * The last fills cut, and what they were cut from: the cut depends only on the year and the grid, so a
   * height-curve slider re-lays the same triangles instead of cutting them again (~170 ms on 1100).
   */
  fillCut: { regions: object; segX: number; segY: number; fills: Float32Array[] } | null
  /** The tribes' colour fading at their limit (ATLAS-258), or `null` when there is none to draw. */
  tribes: TribeLayer | null
  /**
   * The last tribe patches built, and what from (`mapTribeLayer`'s key): like {@link LayerHandles.fillCut},
   * they depend on the year, the grid and the land, not the heights, so a height-curve slider re-lays them
   * instead of measuring every distance again.
   */
  tribeCut: { key: TribeCutKey; patches: TribePatch[] } | null
  /** The events pinned on the relief (CMS-224), or `null` when there is none to pin. */
  events: EventMarkers | null
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
  })
}

/**
 * Whether the year on screen is painted as geometry rather than through the texture: an authored year,
 * with the panel's switch on. The one place both the bake and the layers ask, so the texture never drops
 * a tint the geometry does not then draw.
 * @param dev - the live tunables
 * @param sources - what has been loaded
 * @returns `true` when the fills carry the colour
 */
export function paintsExactFills(dev: DevState, sources: MapSources): boolean {
  return dev.political.exactFills && sources.regionSet?.authored !== undefined
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
