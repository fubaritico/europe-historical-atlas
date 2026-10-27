/**
 * What the map's layers are, and what they are drawn from: the handle of every layer on screen, and the context each
 * family's builder (`map…Layer`, in the family's folder) is handed. Nothing here draws.
 */

import type { DevState } from '../../devState'
import type { MapSources } from '../../mapSources'
import type { CompassRose } from '../decor/rose/compassRose'
import type { EventMarkers } from '../events/markers'
import type { LineLayer } from '../lines/lineLayer'
import type { LevelledBorderLayer } from '../political/borders/levelledBorderLayer'
import type { FillLayer } from '../political/fills/fillLayer'
import type { TribeLayer } from '../political/tribes/tribeLayer'
import type { TribeCutKey, TribePatch } from '../political/tribes/tribePatches'
import type { DrapeProjection } from '../relief/drapeProjection'
import type { MapEdge } from '../relief/mapEdge'
import type { ReliefMesh } from '../relief/reliefMesh'
import type { FrameLabels } from '../sheet/frameLabels'
import type { GraticuleFrame } from '../sheet/graticuleFrame'
import type { MapTitle } from '../sheet/mapTitle'
import type { PaperSheet } from '../sheet/paperSheet'
import type { RiverLayer } from '../waters/riverLayer'
import type { DataTexture, Scene } from 'three'

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
