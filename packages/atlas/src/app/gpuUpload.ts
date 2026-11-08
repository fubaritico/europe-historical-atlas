/**
 * Send objects to the GPU without showing them (ATLAS-396): a map prepared in the background was never drawn, so its
 * buffers went to the GPU on its first showing — one frame of 43 ms on the built site, 2026-11-08. Drawn once here, into
 * a target of one pixel nobody sees, while the map is quiet, the cost is paid then; and the page's copy of each buffer is
 * let go at that upload (`releaseAfterUpload`) instead of being held until the map is shown.
 *
 * **What three uploads on a render, and only that** (`WebGLRenderer.projectObject`, three r186/187): an object visible,
 * on a layer the camera sees, and inside its frustum unless not culled. So for the one render every object is made
 * visible and exempt from culling, and put back as it was after — whatever the camera looks at, the map's buffers and
 * textures go up. A node with a hook of its own before it is drawn — a blur's quad — is left as it was.
 *
 * **Buffers and textures, not programs** (reviews QUAL-002, ARCH-002): three compiles a shader for a render target in
 * another variant than for the canvas (the colour space, the tone mapping — `WebGLPrograms.getParameters`). The canvas's
 * variants are those of the map shown, which shares its shaders: so the first showing measured 8 ms, nothing compiled.
 */

import { Object3D, Scene, WebGLRenderTarget } from 'three'

import type { PerspectiveCamera } from 'three'

/** The slice of the renderer an upload uses — a real `WebGLRenderer` has it; a test stands one up. */
export interface UploadRenderer {
  /**
   * Where it draws now.
   * @returns the target; `null` for the canvas
   */
  getRenderTarget(): WebGLRenderTarget | null
  /**
   * Draw into a target from now on.
   * @param target - the target; `null` for the canvas
   */
  setRenderTarget(target: WebGLRenderTarget | null): void
  /**
   * Draw one frame.
   * @param scene - what to draw
   * @param camera - where from
   */
  render(scene: Scene, camera: PerspectiveCamera): void
}

/** Objects sent to the GPU unseen. */
export interface GpuUpload {
  /**
   * Draw objects once into a target nobody sees, so their buffers are on the GPU before they are shown. They must be
   * off every scene — a map set aside — and are left off it.
   * @param objects - the objects
   */
  upload: (objects: readonly Object3D[]) => void
  /** Free the target. */
  dispose: () => void
}

/**
 * Make every node under the objects drawable for one render, and say how to put them back.
 * @param objects - the objects
 * @returns what puts each node back as it was
 */
function makeDrawable(objects: readonly Object3D[]): () => void {
  const saved: { node: Object3D; visible: boolean; frustumCulled: boolean }[] = []
  for (const object of objects) {
    object.traverse((node) => {
      saved.push({ node, visible: node.visible, frustumCulled: node.frustumCulled })
      // A node with a hook of its own before it is drawn stays as it was: a blur's quad, hidden until its blur is on,
      // would run a whole blur pass from its hook (review QUAL-001) — and it holds nothing heavy to upload.
      if (node.onBeforeRender === Object3D.prototype.onBeforeRender) node.visible = true
      node.frustumCulled = false
    })
  }
  return () => {
    for (const { node, visible, frustumCulled } of saved) {
      node.visible = visible
      node.frustumCulled = frustumCulled
    }
  }
}

/**
 * Build the upload over a renderer and the map's camera.
 * @param renderer - the map's renderer
 * @param camera - the map's camera
 * @returns the upload
 */
export function createGpuUpload(renderer: UploadRenderer, camera: PerspectiveCamera): GpuUpload {
  let target: WebGLRenderTarget | null = null
  return {
    upload(objects) {
      if (objects.length === 0) return
      target ??= new WebGLRenderTarget(1, 1)
      const stage = new Scene()
      const putBack = makeDrawable(objects)
      stage.add(...objects)
      const previous = renderer.getRenderTarget()
      try {
        renderer.setRenderTarget(target)
        renderer.render(stage, camera)
      } finally {
        renderer.setRenderTarget(previous)
        for (const object of objects) stage.remove(object)
        putBack()
      }
    },
    dispose() {
      target?.dispose()
      target = null
    },
  }
}
