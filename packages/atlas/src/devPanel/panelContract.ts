/**
 * What the dev panel binds to: the live setting objects lil-gui edits in place, and the side effects the
 * composition root performs on the map when one of them changes.
 */

import type { MapControlsOptions } from '../controls/controlsState'
import type {
  CoastlineDevParams,
  ExtentDevParams,
  FrameDevParams,
  PoliticalDevParams,
  ReliefDevParams,
  RhumbDevParams,
  RiverDevParams,
  RoseDevParams,
  TribeDevParams,
  VassalDevParams,
} from '../tunables/params'
import type { TerrainTextureOptions } from '@europe-historical-atlas/core/pipeline/terrainCompose'

/**
 * Side effects the panel triggers on the live scene (implemented by the composition root, which owns the
 * mutable relief/coastline/camera handles).
 */
export interface DevPanelCallbacks {
  /**
   * Rebuild the relief geometry (height curve, smoothing, shore ramp or subdivision changed), and with it
   * the lines laid on it: the coastline, the rivers and the borders.
   */
  rebuildRelief: () => void
  /** Regenerate the terrain texture (a full pixel pass). */
  rebuildTexture: () => void
  /** Rebuild the coastline geometry (jitter / strokes / seaLevel changed). */
  rebuildCoastline: () => void
  /** Rebuild the rhumb network (centre / layout / seaLevel changed). */
  rebuildRhumb: () => void
  /** Rebuild the river network (lake filter / jitter changed). */
  rebuildRivers: () => void
  /** Reload and re-rasterise the political overlay (year or colouring changed). */
  rebuildPolitical: () => void
  /** Redraw the border lines from the geometry already traced (styling changed). */
  rebuildBorders: () => void
  /** Trace the border lines again from the political grid already held (smoothing changed). */
  rebuildBorderGeometry: () => void
  /** Update the live river material colour. */
  setRiverColor: (color: string) => void
  /** Rebuild the compass rose (colours / labels / size / lift changed). */
  rebuildRose: () => void
  /** Rebuild the sheet and the graduated border framing the map. */
  rebuildFrame: () => void
  /** Update the live compass-rose opacity. */
  setRoseOpacity: (value: number) => void
  /** Toggle the relief wireframe on the live material. */
  setWireframe: (value: boolean) => void
  /** Update the live coastline material colour. */
  setCoastColor: (color: string) => void
  /** Update the live rhumb-network material colour. */
  setRhumbColor: (color: string) => void
  /** Apply a new camera field of view. */
  setFov: (value: number) => void
  /** Re-apply the extent to the controls (centre / half-size changed). */
  applyExtent: () => void
  /** Show / hide the extent + frustum-footprint debug rectangles. */
  setFrustumDebug: (value: boolean) => void
  /** Log every tunable value (paste back as defaults). */
  logAll: () => void
  /** Log the current camera state. */
  logCameraState: () => void
}

/**
 * Everything the dev panel binds to: the mutable param objects (edited in place by lil-gui) plus the
 * side-effect callbacks. Keeps `main.ts` focused on the pipeline + render loop.
 */
export interface DevPanelDeps {
  /** Relief tuning params. */
  relief: ReliefDevParams
  /** Terrain texture options. */
  texture: TerrainTextureOptions
  /** Coastline styling params. */
  coast: CoastlineDevParams
  /** Rhumb-network styling + layout params. */
  rhumb: RhumbDevParams
  /** River-network styling + level of detail. */
  river: RiverDevParams
  /** Historical political overlay params. */
  political: PoliticalDevParams
  /** How the zoom reveals the levels of homage. */
  vassals: VassalDevParams
  /** How a tribe's colour vanishes at its limit. */
  tribes: TribeDevParams
  /** Compass-rose styling params. */
  rose: RoseDevParams
  /** The sheet the map is printed on, and its graduated border. */
  frame: FrameDevParams
  /** The live controls options object (mutated in place, read every frame). */
  controlsOptions: MapControlsOptions
  /** The camera framing (fov). */
  framing: { fov: number }
  /** The view-clamp extent params. */
  extent: ExtentDevParams
  /** Debug-overlay toggle state (read every frame by the render loop). */
  debug: { showFrustum: boolean }
  /** Live-scene side effects. */
  callbacks: DevPanelCallbacks
}
