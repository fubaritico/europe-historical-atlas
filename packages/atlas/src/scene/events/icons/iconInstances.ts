/**
 * The 3D icons on the map, drawn as instances (ATLAS-289): each kind's model is built once (`meshes/iconModel`), and
 * each of its pieces is one `InstancedMesh` holding every icon of that kind. An icon is then nothing but a pose — where
 * it stands, how it is turned, how tall — so a hundred battles cost the three draws of the swords' three colours, not
 * eight hundred.
 */

import { Group, InstancedMesh, Matrix4, Vector3 } from 'three'

import { applyDepthBias } from '../../depthBias'
import { EVENT_RENDER_ORDER } from '../markers'

import { buildIconModel } from './meshes/iconModel'
import { ICON_SIZE } from './settings'
import { slotsByKey } from './slots'

import type { EventIconKind } from './kinds'
import type { IconModel } from './meshes/iconModel'
import type { Quaternion } from 'three'

/** Every icon of the map as instances, and what is set on them. */
export interface IconInstances {
  /** The instanced meshes, one per piece of each kind present. */
  readonly object: Group
  /**
   * Pose every icon and hand the poses to the GPU, in one step — so no writer of a pose can forget to send it.
   * @param poses - each icon's pose, in the order the kinds were given
   * @returns nothing
   * @throws when the poses are not one per icon — the caller's lists have fallen out of step, a defect
   */
  poseAll(poses: readonly IconPose[]): void
  /**
   * Fade every icon, for the cross-fade with the flat drawings.
   * @param opacity - 0 gone, 1 solid
   * @returns nothing
   */
  setOpacity(opacity: number): void
  /** Free the models and the instance buffers. */
  dispose(): void
}

/** Where one icon's base stands, and how it is turned. */
export interface IconPose {
  /** Where its base stands, in the world. */
  readonly position: Vector3
  /** How it is turned. */
  readonly quaternion: Quaternion
}

/** One kind's share: its model, and its instanced pieces. */
interface KindInstances {
  /** The model its pieces draw. */
  model: IconModel
  /** One instanced mesh per piece of the model. */
  meshes: InstancedMesh[]
}

/**
 * Per kind present: its model, built once, and an instanced mesh per piece sized to the kind's icons — all in one group.
 * @param counts - how many icons each kind holds
 * @param depthPull - how far the pieces are pulled toward the camera, in world units (`ICON_DEPTH_PULL`)
 * @returns the group, and each kind's share
 */
function kindInstances(
  counts: ReadonlyMap<EventIconKind, number>,
  depthPull: number
): {
  object: Group
  byKind: Map<EventIconKind, KindInstances>
} {
  const object = new Group()
  // After the borders: three sorts the transparent pass by the nearest group's order, so it is set on the group —
  // left at 0, it would draw every icon under the borders (`EVENT_RENDER_ORDER`, `WebGLRenderer.js` projectObject).
  object.renderOrder = EVENT_RENDER_ORDER
  const byKind = new Map<EventIconKind, KindInstances>()
  for (const [kind, count] of counts) {
    const model = buildIconModel(kind)
    const meshes = model.pieces.map((piece) => {
      // Pulled toward the camera, so the relief does not cut the icon as it turns.
      applyDepthBias(piece.material, 'built-in', depthPull)
      const mesh = new InstancedMesh(piece.geometry, piece.material, count)
      mesh.name = `${kind} ${piece.colour}`
      // Every instance turns every frame, so a bounding sphere would be stale by the next one and could cull an
      // icon still on screen; the few draws this costs are not worth culling.
      mesh.frustumCulled = false
      object.add(mesh)
      return mesh
    })
    byKind.set(kind, { model, meshes })
  }
  return { object, byKind }
}

/**
 * Build the instances for a set of icons.
 * @param kinds - each icon's kind, in the icons' order
 * @param height - how tall an icon stands, in world units
 * @param depthPull - how far the icons are pulled toward the camera, in world units — 0 leaves them where they are
 * @returns the instances, every icon at the origin until it is posed
 */
export function createIconInstances(
  kinds: readonly EventIconKind[],
  height: number,
  depthPull: number
): IconInstances {
  // 1. Each item's slot among those of its key, and how many each key holds.
  const { slots, counts } = slotsByKey(kinds)

  // 2. Per kind present, its model and its instanced pieces, in one group drawn after the borders.
  const { object, byKind } = kindInstances(counts, depthPull)

  // 3. Each icon's pieces, looked up once: its kind's meshes, which a pose is written into.
  const iconMeshes = kinds.map((kind) => {
    // Every kind given has its pieces: the counts were taken from the very same list.
    const own = byKind.get(kind)
    if (own === undefined) throw new Error(`[atlas] no ${kind} instances built`)
    return own.meshes
  })

  // Each icon's size: the icon height times its kind's (`ICON_SIZE`).
  const sizes = kinds.map((kind) => height * ICON_SIZE[kind])

  // Worked in at every pose, never reallocated.
  const matrix = new Matrix4()
  const scale = new Vector3()

  return {
    object,
    poseAll(poses: readonly IconPose[]): void {
      if (poses.length !== kinds.length)
        throw new Error(`[atlas] ${String(poses.length)} poses for ${String(kinds.length)} icons`)
      // One matrix per icon, written into each piece of its kind at its slot.
      poses.forEach(({ position, quaternion }, index) => {
        const meshes = iconMeshes[index]
        const slot = slots[index]
        const size = sizes[index]
        if (meshes === undefined || slot === undefined || size === undefined)
          throw new Error(`[atlas] no icon ${String(index)} to pose`)
        matrix.compose(position, quaternion, scale.setScalar(size))
        for (const mesh of meshes) mesh.setMatrixAt(slot, matrix)
      })
      // Then every piece's buffer handed over at once.
      for (const { meshes } of byKind.values())
        for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true
    },
    setOpacity(opacity: number): void {
      for (const { model } of byKind.values()) model.setOpacity(opacity)
    },
    dispose(): void {
      for (const { model, meshes } of byKind.values()) {
        for (const mesh of meshes) mesh.dispose()
        model.dispose()
      }
    },
  }
}
