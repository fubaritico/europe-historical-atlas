import { Mesh, MeshBasicMaterial, PlaneGeometry } from 'three'

import type { Heightmap } from '@europe-historical-atlas/core/data/heightmap'
import type { BufferAttribute, Texture } from 'three'

/**
 * Options controlling the relief mesh build.
 */
export interface ReliefOptions {
  /** World-space width of the map plane (X axis). Depth follows the grid aspect ratio. */
  worldWidth: number
  /** Number of horizontal segments (vertices = segments + 1). Depth segments follow the aspect ratio. */
  segments: number
  /** Elevations up to this (metres) are kept 1:1 — plains stay plains, with their small relief. */
  plainsCeiling: number
  /**
   * Apparent height (metres) the highest peaks ease toward. Above `plainsCeiling`, elevations are remapped
   * with a smooth ease-out (C1-continuous at the threshold — no kink, no blur → ridges stay sharp) so a
   * 4441 m peak reads as ~`peakTarget` m. Lower = flatter mountains.
   */
  peakTarget: number
  /** Wireframe render (validate the geometry before texturing). */
  wireframe: boolean
  /**
   * Baked terrain texture (parchment + tint + hillshade) applied to the unlit material's `map`. Omit for
   * a flat brown fallback. Aligned with the geometry UVs by construction (see `terrainTexture`).
   */
  map?: Texture
}

/**
 * Base world scale per metre of elevation; `mesh.scale.y` (exaggeration) multiplies this. Chosen so the
 * exaggeration slider sits around ~1 rather than ~0.1, which keeps it low-sensitivity and usable.
 */
export const WORLD_PER_METRE = 1 / 10000

/**
 * Place an elevation on the relief surface, in world units.
 *
 * A value remap, deliberately not a blur, so ridges stay sharp: plains up to `plainsCeiling` pass
 * through 1:1, higher elevations ease out toward `peakTarget` (mountains collapse smoothly instead of
 * spiking). The slope is 1 at the threshold, so plains and mountains join without a kink. Sea (elevation
 * ≤ 0) is flat.
 *
 * Exported because anything draped on the terrain — rivers, borders, future labels — has to land on the
 * exact same surface. Duplicating this curve at the call site is how overlays silently detach from the
 * relief the first time it is retuned.
 * @param elevation - the sample elevation in metres
 * @param options - the height curve (`plainsCeiling`, `peakTarget`)
 * @returns the surface height in world units, before the live `scale.y` exaggeration
 */
export function reliefWorldY(
  elevation: number,
  options: Pick<ReliefOptions, 'plainsCeiling' | 'peakTarget'>
): number {
  const { plainsCeiling, peakTarget } = options
  const reach = Math.max(1, peakTarget - plainsCeiling)
  const metres =
    elevation > plainsCeiling
      ? plainsCeiling + (1 - Math.exp(-(elevation - plainsCeiling) / reach)) * reach
      : elevation > 0
        ? elevation
        : 0
  return metres * WORLD_PER_METRE
}

/**
 * The dimensions of a source grid — all the mesh layout needs from one.
 *
 * Declared structurally rather than as `HeightmapMeta` so that anything with a width and a height can
 * ask where the mesh puts its vertices, without dragging in the data layer.
 */
export interface GridFrame {
  /** Grid width in samples. */
  readonly width: number
  /** Grid height in samples. */
  readonly height: number
}

/** How the subdivided plane's vertices are laid out over a source grid. */
export interface MeshVertexGrid {
  /** Source grid aspect, width / height. */
  aspect: number
  /** Subdivisions along X (west→east) — the requested count, unchanged. */
  segX: number
  /** Subdivisions along Z (north→south), never below one so the plane always has a surface. */
  segY: number
}

/**
 * Where the relief mesh puts its vertices over a source grid.
 *
 * Exported for the same reason as {@link reliefWorldY}: anything draped on the terrain lands on the
 * surface these nodes define, so recomputing the layout at the call site is how an overlay silently
 * keeps an old subdivision after the mesh has changed its own.
 * @param frame - the source grid's dimensions
 * @param segments - the requested subdivision count along X
 * @returns the vertex grid the mesh will build
 */
export function meshVertexGrid(frame: GridFrame, segments: number): MeshVertexGrid {
  const aspect = frame.width / frame.height
  return { aspect, segX: segments, segY: Math.max(1, Math.round(segments / aspect)) }
}

/**
 * How deep the map plane is on Z, for a given width — the grid's aspect, applied.
 * @param frame - the source grid's dimensions
 * @param worldWidth - the plane's world-space width on X
 * @returns the plane's world-space depth on Z
 */
export function meshWorldDepth(frame: GridFrame, worldWidth: number): number {
  return worldWidth / (frame.width / frame.height)
}

/**
 * Build a relief mesh by displacing a subdivided plane from a {@link Heightmap} (CPU displacement, so
 * raycasting hits the real relief). Heights are in absolute metres remapped by an ease-out curve
 * (elevations ≤ `plainsCeiling` pass through 1:1, higher ones ease toward `peakTarget`) then scaled into
 * world units by a fixed `worldPerMetre` factor; sea (elevation ≤ 0) is flat (y = 0). Apply vertical
 * exaggeration at the call site via `mesh.scale.y` for live tuning.
 *
 * The plane lies in the XZ ground plane (+Y up); north (grid top row) faces −Z, east faces +X.
 * @param heightmap - the elevation source
 * @param options - build options
 * @returns the relief mesh (metres × `worldPerMetre`; scale Y at the call site for exaggeration)
 */
export function createReliefMesh(
  heightmap: Heightmap,
  options: ReliefOptions
): Mesh<PlaneGeometry, MeshBasicMaterial> {
  const { worldWidth, segments, plainsCeiling, peakTarget, wireframe } = options
  const { segX, segY } = meshVertexGrid(heightmap.meta, segments)
  const worldDepth = meshWorldDepth(heightmap.meta, worldWidth)

  const geometry = new PlaneGeometry(worldWidth, worldDepth, segX, segY)
  geometry.rotateX(-Math.PI / 2) // lay flat in the XZ plane, +Y up

  const position = geometry.getAttribute('position') as BufferAttribute
  const cols = segX + 1
  const rows = segY + 1
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const e = heightmap.sample(col / segX, row / segY)
      position.setY(row * cols + col, reliefWorldY(e, { plainsCeiling, peakTarget }))
    }
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()

  // Unlit: the hillshade is baked into `map`, so the relief reads the same at any camera angle (the
  // painted "old map" look). White base when textured so the map's colours show unmodulated; brown
  // fallback otherwise.
  const material = new MeshBasicMaterial({
    color: options.map ? '#ffffff' : '#8a5a2b',
    map: options.map ?? null,
    wireframe,
  })
  return new Mesh(geometry, material)
}
