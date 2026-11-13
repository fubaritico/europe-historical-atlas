/**
 * What the map's layers are, and what they are drawn from: the handle of every layer on screen, and the context each
 * family's builder (`map…Layer`, in the family's folder) is handed. Nothing here draws.
 */

import type { MapSources } from '../../sources/mapSources'
import type { DevState } from '../../tunables/devState'
import type { BlurMethod } from '../blur/blurMethod'
import type { DrawCityLabel } from '../cities/cityLabel'
import type { CompassRose } from '../decor/rose/compassRose'
import type { DrawSeaLabel } from '../decor/seas/seaLabel'
import type { SeaNameLayer } from '../decor/seas/seaNameLayer'
import type { DetailState } from '../detail/detailView'
import type { EventMarkers } from '../events/markers'
import type { LineLayer } from '../lines/lineLayer'
import type { LevelledBorderLayer } from '../political/borders/levelledBorderLayer'
import type { FillLayer } from '../political/fills/fillLayer'
import type { HatchLayer } from '../political/hatches/hatchLayer'
import type { NameLayer } from '../political/names/nameLayer'
import type { TribeCutKey } from '../political/tribes/tribeCutKey'
import type { TribeLayer } from '../political/tribes/tribeLayer'
import type { DrapeProjection } from '../relief/drapeProjection'
import type { LandTextures } from '../relief/landTextures'
import type { MapEdge } from '../relief/mapEdge'
import type { ReliefMesh } from '../relief/reliefMesh'
import type { FrameLabels } from '../sheet/frameLabels'
import type { GraticuleFrame } from '../sheet/graticuleFrame'
import type { MapTitle } from '../sheet/mapTitle'
import type { PaperSheet } from '../sheet/paperSheet'
import type { RiverLayer } from '../waters/riverLayer'
import type { FillArrays } from '@europe-historical-atlas/core/pipeline/fillBuffers'
import type { IndexedFill } from '@europe-historical-atlas/core/pipeline/indexFill'
import type { TribePatch } from '@europe-historical-atlas/core/pipeline/tribePatches'
import type { DataTexture, Object3D, Scene } from 'three'

/** Every layer currently on screen, or `null` where one has not been built yet. */
export interface LayerHandles {
  /** The terrain itself. */
  relief: ReliefMesh | null
  /** The wall around its edge, which makes it a slab rather than a surface. */
  edge: MapEdge | null
  /** The baked look hanging on it, managed apart from the mesh: a retune is a texture swap, not a rebuild. */
  texture: DataTexture | null
  /** The land mask on the GPU, which the tints read to stop on the coast (CORE-421) — made once, at first need. */
  land: LandTextures | null
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
  fillCut: { regions: object; segX: number; segY: number; fills: IndexedFill[] } | null
  /**
   * The fills laid in the worker for the year about to be laid (ATLAS-396), and what they were laid from — the year's
   * polities, the grid, the tints, the band depths and the relief, all compared by identity: used once, by the next
   * build that matches, then let go, as the GPU holds them after.
   */
  fillArrays: {
    regions: object
    segX: number
    segY: number
    tintLevels: object
    bandDepths: object
    relief: object | null
    arrays: FillArrays
  } | null
  /** The tribes' colour fading at their limit (ATLAS-258), or `null` when there is none to draw. */
  tribes: TribeLayer | null
  /** The overlaps hatched in their polities' colours (ATLAS-399), or `null` when there is none to draw. */
  hatches: HatchLayer | null
  /**
   * The last tribe patches built, and what from (`mapTribeLayer`'s key): like {@link LayerHandles.fillCut},
   * they depend on the year, the grid and the land, not the heights, so a height-curve slider re-lays them
   * instead of measuring every distance again.
   */
  tribeCut: { key: TribeCutKey; patches: TribePatch[] } | null
  /** The countries' names (ATLAS-301), or `null` before the year's names and their sheet are in. */
  names: NameLayer | null
  /** The events pinned on the relief (CMS-224), or `null` when there is none to pin. */
  events: EventMarkers | null
  /** The compass rose. */
  compass: CompassRose | null
  /** The seas' names (ATLAS-440), or `null` before the relief's frame and the names' face are in. */
  seaNames: SeaNameLayer | null
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
  /**
   * How the map's blurs are drawn (ATLAS-304): the standard draws each with images of its own; a lighter method may be
   * injected instead. Handed over: the layers free it with themselves.
   */
  blurMethod: BlurMethod
  /**
   * How a city's name is drawn (`cities/cityLabel`): made once by the composition root, so its face is loaded once for
   * the session, whatever the layers rebuild.
   */
  cityLabels: DrawCityLabel
  /** How a sea's name is drawn (`decor/seas/seaLabel`, ATLAS-440): made once by the composition root, as the cities'. */
  seaLabels: DrawSeaLabel
  /**
   * Send objects to the GPU unseen (`app/gpuUpload`, ATLAS-396): a map prepared in the background, so its first showing
   * uploads nothing. The renderer's, handed in by the composition root — the layers never hold the renderer.
   */
  uploadUnseen: (objects: readonly Object3D[]) => void
}

/** The layers plus the things they need, passed to every builder instead of captured in a closure. */
export interface LayerContext extends MapLayersDeps {
  /** How a grid coordinate becomes a world position, flat or draped. */
  projection: DrapeProjection
  /** The live handles, mutated in place as layers are rebuilt. */
  handles: LayerHandles
  /**
   * How far the year's layers have come in — the countries, their borders, their names and the events — `0` hidden,
   * `1` whole: what they fade in with at startup, over the relief shown first (the dev, 2026-10-29). Applied by every
   * frame, multiplied into each layer's own opacity.
   */
  reveal: { value: number }
  /** The level of detail across frames (`scene/detail`): what the vassals, the names' watermark and the cities show. */
  detail: DetailState
}
