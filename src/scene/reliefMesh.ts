import { Mesh, MeshStandardMaterial, PlaneGeometry } from 'three'

import type { Heightmap } from '../data/heightmap'
import type { BufferAttribute } from 'three'

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
}

/**
 * Build a relief mesh by displacing a subdivided plane from a {@link Heightmap} (CPU displacement, so
 * raycasting hits the real relief). Elevation is normalized to `[0, 1]` (peak = max); apply vertical
 * exaggeration at the call site via `mesh.scale.y` for live tuning. Sea (elevation ≤ 0) is flat (y = 0).
 *
 * The plane lies in the XZ ground plane (+Y up); north (grid top row) faces −Z, east faces +X.
 * @param heightmap - the elevation source
 * @param options - build options
 * @returns the relief mesh (normalized heights; scale Y at the call site for exaggeration)
 */
export function createReliefMesh(
  heightmap: Heightmap,
  options: ReliefOptions
): Mesh<PlaneGeometry, MeshStandardMaterial> {
  const { worldWidth, segments, plainsCeiling, peakTarget, wireframe } = options
  const aspect = heightmap.meta.width / heightmap.meta.height
  const worldDepth = worldWidth / aspect
  const segX = segments
  const segY = Math.max(1, Math.round(segments / aspect))

  const geometry = new PlaneGeometry(worldWidth, worldDepth, segX, segY)
  geometry.rotateX(-Math.PI / 2) // lay flat in the XZ plane, +Y up

  const position = geometry.getAttribute('position') as BufferAttribute
  const cols = segX + 1
  const rows = segY + 1
  // Per-vertex value remap (no blur → ridges stay sharp): plains ≤ ceiling are 1:1; higher elevations
  // ease-out toward `peakTarget` (mountains collapse smoothly instead of spiking). Slope is 1 at the
  // threshold, so plains and mountains join without a kink.
  const reach = Math.max(1, peakTarget - plainsCeiling)
  // Base world scale per metre; `mesh.scale.y` (exaggeration) multiplies this. Chosen so exaggeration
  // sits around ~1 (not ~0.1) for a usable, low-sensitivity slider.
  const worldPerMetre = 1 / 10000
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const e = heightmap.sample(col / segX, row / segY)
      let metres = 0
      if (e > plainsCeiling)
        metres = plainsCeiling + (1 - Math.exp(-(e - plainsCeiling) / reach)) * reach
      else if (e > 0) metres = e
      position.setY(row * cols + col, metres * worldPerMetre)
    }
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()

  const material = new MeshStandardMaterial({ color: '#8a5a2b', wireframe }) // brown (vintage palette)
  return new Mesh(geometry, material)
}
