/**
 * Taking a layer off the scene and freeing what it holds on the GPU — the one way every layer leaves.
 */

import type { Object3D, Scene } from 'three'

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
