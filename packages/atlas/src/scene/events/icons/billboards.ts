/**
 * Flat squares that always face the reader — the halos behind the 3D markers and the flat drawings, the drawings seen
 * from afar — drawn as
 * instances (ATLAS-289): one `InstancedMesh` per material, holding every square that shows it. A sprite does the same
 * one draw at a time; here a hundred halos are one draw, and each kind's drawings one more.
 *
 * They face the reader as a sprite does: every square takes the camera's own orientation, so it lies in the screen's
 * plane wherever it stands.
 */

import { Group, InstancedMesh, Matrix4, PlaneGeometry, Vector3 } from 'three'

import { slotsByKey } from './slots'

import type { Material, Quaternion } from 'three'

/** A set of facing squares, and what is set on them. */
export interface Billboards {
  /** The instanced meshes, one per material. */
  readonly object: Group
  /**
   * Place every square, turned as the camera is, and hand the poses to the GPU in one step.
   * @param positions - each square's middle, in the world, in the order the keys were given
   * @param facing - the camera's orientation, which every square takes
   * @param size - each square's side, in world units
   * @returns nothing
   * @throws when the positions are not one per square — the caller's lists have fallen out of step, a defect
   */
  poseAll(positions: readonly Vector3[], facing: Quaternion, size: number): void
  /** Free the squares and the instance buffers; the materials belong to whoever made them. */
  dispose(): void
}

/**
 * One instanced mesh per key: over one unit square, shared — or, for a key moved aside, over a square of its own,
 * moved in the square's own plane, so the shift follows the square's size and the camera's turn.
 * @param counts - how many squares each key holds
 * @param materialOf - the material a key shows
 * @param shiftOf - how far a key's squares are moved aside, in square sides
 * @returns the meshes by key, in the keys' order, and every square built, to be freed with them
 */
function meshesByKey<K extends string>(
  counts: ReadonlyMap<K, number>,
  materialOf: (key: K) => Material,
  shiftOf: (key: K) => number
): { byKey: Map<K, InstancedMesh>; squares: PlaneGeometry[] } {
  const shared = new PlaneGeometry(1, 1)
  const squares = [shared]
  const byKey = new Map<K, InstancedMesh>()
  for (const [key, count] of counts) {
    const shift = shiftOf(key)
    let square = shared
    if (shift !== 0) {
      square = new PlaneGeometry(1, 1).translate(shift, 0, 0)
      squares.push(square)
    }
    const mesh = new InstancedMesh(square, materialOf(key), count)
    mesh.name = key
    // Re-posed every frame, so a bounding sphere would always be stale; not worth culling.
    mesh.frustumCulled = false
    byKey.set(key, mesh)
  }
  return { byKey, squares }
}

/**
 * Build a set of facing squares.
 * @param keys - each square's key — which material it shows — in the squares' order
 * @param materialOf - the material a key shows
 * @param renderOrder - the draw order of the whole set, set on its group (three sorts by the nearest group's order)
 * @param shiftOf - how far a key's squares are moved aside of their place, in square sides, positive to the reader's
 *   right — for a drawing planted by another point than its middle (`flat/eventIconSvg.flatIconShift`); none unless
 *   given
 * @returns the squares, every one at the origin until it is posed
 */
export function createBillboards<K extends string>(
  keys: readonly K[],
  materialOf: (key: K) => Material,
  renderOrder: number,
  shiftOf: (key: K) => number = () => 0
): Billboards {
  // 1. Each item's slot among those of its key, and how many each key holds.
  const { slots, counts } = slotsByKey(keys)

  // 2. An instanced mesh per key, over the shared unit square or the key's own, moved aside.
  const { byKey, squares } = meshesByKey(counts, materialOf, shiftOf)
  const object = new Group()
  object.renderOrder = renderOrder
  for (const mesh of byKey.values()) object.add(mesh)

  // 3. Each square's mesh, looked up once.
  const meshOf = keys.map((key) => {
    const mesh = byKey.get(key)
    if (mesh === undefined) throw new Error(`[atlas] no billboards built for ${key}`)
    return mesh
  })

  // Worked in at every pose, never reallocated.
  const matrix = new Matrix4()
  const scale = new Vector3()

  return {
    object,
    poseAll(positions: readonly Vector3[], facing: Quaternion, size: number): void {
      if (positions.length !== keys.length)
        throw new Error(
          `[atlas] ${String(positions.length)} positions for ${String(keys.length)} billboards`
        )
      // Every square turned as the camera is, at its own place, all the same size.
      scale.set(size, size, size)
      positions.forEach((position, index) => {
        const mesh = meshOf[index]
        const slot = slots[index]
        if (mesh === undefined || slot === undefined)
          throw new Error(`[atlas] no billboard ${String(index)} to pose`)
        matrix.compose(position, facing, scale)
        mesh.setMatrixAt(slot, matrix)
      })
      for (const mesh of byKey.values()) mesh.instanceMatrix.needsUpdate = true
    },
    dispose(): void {
      for (const mesh of byKey.values()) mesh.dispose()
      for (const square of squares) square.dispose()
    },
  }
}
