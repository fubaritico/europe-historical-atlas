/**
 * The tribes' geometry: every patch's triangles placed on the relief, each vertex carrying the tribe's colour, its
 * distance to the tribe's outline and to the others' ground, and whether it is dry.
 */

import { planeHeight } from '@europe-historical-atlas/core/pipeline/gridDrape'

import type { TintSurface } from '../tintOnRelief'
import type { TribePatch } from './tribePatches'

/** What the tribes' geometry is built from: the patches, and the surface they are laid on. */
export interface TribeGeometry extends TintSurface {
  /** Each tribe's triangles, distances and colour — `tribePatches`' output. */
  patches: readonly TribePatch[]
}

/** Every tribe's vertices, ready to upload: one array per attribute. */
export interface TribeBuffers {
  /** Three floats per vertex, in world space. */
  positions: Float32Array
  /** Three bytes per vertex: the tribe's colour. */
  tints: Uint8Array
  /** The signed distance to the tribe's outline, km. */
  distances: Float32Array
  /** The signed distance to every other polity's ground, km. */
  claimed: Float32Array
  /** `1` dry, `0` wet. */
  land: Float32Array
}

/**
 * How many vertices a patch has, checked against what it carries per vertex.
 * @param patch - the patch
 * @returns its vertex count
 * @throws when a per-vertex array is of another length — built together, so a mismatch is a defect, and a
 *   guessed distance would fade a tribe from a line nobody drew
 */
function vertexCount(patch: TribePatch): number {
  const count = Math.floor(patch.triangles.length / 2)
  // Every per-vertex array must match the triangles' vertex count.
  for (const per of [patch.distances, patch.claimed, patch.land])
    if (per.length !== count)
      throw new Error(
        `tribe layer: ${String(count)} vertices but ${String(per.length)} distances or land values`
      )
  return count
}

/**
 * Write one patch's vertices, each laid on the relief plane under it.
 * @param patch - the patch
 * @param out - the buffers, written in place
 * @param at - the first vertex to write
 * @param surface - the surface the vertices are laid on
 * @returns the vertex after the last one written
 */
function writePatch(
  patch: TribePatch,
  out: TribeBuffers,
  at: number,
  surface: TintSurface
): number {
  const { triangles, tint } = patch
  let vertex = at
  // The `?? 0` read indices the loop keeps in range (`noUncheckedIndexedAccess`); none stands in for a value
  // that failed to arrive — `vertexCount` checked every length.
  for (let k = 0; k < patch.distances.length; k++) {
    const u = triangles[2 * k] ?? 0
    const v = triangles[2 * k + 1] ?? 0
    // Lay the vertex on the relief, then copy its colour, distances and land beside it.
    out.positions.set(
      [
        (u - 0.5) * surface.worldWidth,
        planeHeight(u, v, surface.grid, surface.nodeY),
        (v - 0.5) * surface.worldDepth,
      ],
      3 * vertex
    )
    out.tints.set([tint.r, tint.g, tint.b], 3 * vertex)
    out.distances[vertex] = patch.distances[k] ?? 0
    out.claimed[vertex] = patch.claimed[k] ?? 0
    out.land[vertex] = patch.land[k] ?? 0
    vertex += 1
  }
  return vertex
}

/**
 * The positions, colours, distances and land of every tribe's vertices, in world space.
 * @param options - the patches and the surface they are laid on
 * @returns the buffers, one entry per vertex in each
 * @throws when a patch carries a different number of distances or land values than vertices
 */
export function tribeBuffers(options: TribeGeometry): TribeBuffers {
  // Count every vertex first, so each buffer is allocated once at its exact size.
  const vertices = options.patches.reduce((sum, patch) => sum + vertexCount(patch), 0)
  const out: TribeBuffers = {
    positions: new Float32Array(vertices * 3),
    tints: new Uint8Array(vertices * 3),
    distances: new Float32Array(vertices),
    claimed: new Float32Array(vertices),
    land: new Float32Array(vertices),
  }
  // Then write the patches one after the other.
  let at = 0
  for (const patch of options.patches) at = writePatch(patch, out, at, options)
  return out
}
