/**
 * The live tunables, as one object the whole app reads and the dev panel writes.
 *
 * Every field is a *mutable copy* of its declared defaults, and that is the point: the panel mutates
 * these objects in place, and the modules that draw the map read them on every rebuild. Snapshotting a
 * value at build time is how a slider silently stops working — which this project has lost two sets of
 * controls to (see `known-issues.md`).
 *
 * Root-level rather than inside `devParams/`, which is a declaration table and must stay free of state:
 * the defaults say what a control *is*, this says what it currently *holds*.
 */

import {
  DEFAULT_COASTLINE_PARAMS,
  DEFAULT_EXTENT_PARAMS,
  DEFAULT_POLITICAL_PARAMS,
  DEFAULT_RELIEF_PARAMS,
  DEFAULT_RHUMB_PARAMS,
  DEFAULT_RIVER_PARAMS,
  DEFAULT_ROSE_PARAMS,
} from './devParams'
import { DEFAULT_TERRAIN_OPTIONS } from './pipeline/terrainCompose'

import type { MapRect } from './controls/mapControls'
import type {
  CoastlineDevParams,
  ExtentDevParams,
  PoliticalDevParams,
  ReliefDevParams,
  RhumbDevParams,
  RiverDevParams,
  RoseDevParams,
} from './devParams'
import type { TerrainTextureOptions } from './pipeline/terrainCompose'

/** The camera's own framing, which is not a map-controls option. */
export interface FramingState {
  /** Vertical field of view in degrees. Lower reads flatter, and so more like a map. */
  fov: number
}

/** Debug overlays, off by default. */
export interface DebugState {
  /** Draw the map extent and the live frustum footprint on the ground. */
  showFrustum: boolean
}

/** Everything the dev panel can move, held live. */
export interface DevState {
  /** Relief geometry and displacement. */
  relief: ReliefDevParams
  /** The baked terrain look. */
  texture: TerrainTextureOptions
  /** Coastline styling. */
  coast: CoastlineDevParams
  /** Portolan rhumb network. */
  rhumb: RhumbDevParams
  /** River network. */
  river: RiverDevParams
  /** The historical political overlay. */
  political: PoliticalDevParams
  /** Compass rose. */
  rose: RoseDevParams
  /** The world rectangle the camera is clamped within. */
  extent: ExtentDevParams
  /** Camera framing. */
  framing: FramingState
  /** Debug overlays. */
  debug: DebugState
}

/**
 * Build the live tunables from their declared defaults.
 * @returns a fresh, independent set — two calls share nothing
 */
export function createDevState(): DevState {
  return {
    relief: { ...DEFAULT_RELIEF_PARAMS },
    texture: { ...DEFAULT_TERRAIN_OPTIONS },
    coast: { ...DEFAULT_COASTLINE_PARAMS },
    rhumb: { ...DEFAULT_RHUMB_PARAMS },
    river: { ...DEFAULT_RIVER_PARAMS },
    political: { ...DEFAULT_POLITICAL_PARAMS },
    rose: { ...DEFAULT_ROSE_PARAMS },
    extent: { ...DEFAULT_EXTENT_PARAMS },
    framing: { fov: 35 },
    debug: { showFrustum: false },
  }
}

/**
 * The world rectangle the camera must stay within, from its centre and half-size.
 *
 * Tuned as centre plus half-size rather than as four edges because that is how it is thought about —
 * "the map is here, and this big" — and because moving a centre keeps the rectangle's shape.
 * @param extent - the centre and half-size
 * @returns the rectangle the frustum clamp works from
 */
export function extentRect(extent: ExtentDevParams): MapRect {
  return {
    minX: extent.centerX - extent.halfWidth,
    maxX: extent.centerX + extent.halfWidth,
    minZ: extent.centerZ - extent.halfDepth,
    maxZ: extent.centerZ + extent.halfDepth,
  }
}
