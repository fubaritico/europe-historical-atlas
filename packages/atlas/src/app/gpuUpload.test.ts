import { BufferGeometry, Group, Mesh, PerspectiveCamera, Scene, WebGLRenderTarget } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createGpuUpload } from './gpuUpload'

import type { UploadRenderer } from './gpuUpload'
import type { Object3D } from 'three'

/**
 * A renderer that records what it drew, where, and how each object stood at that moment.
 * @param fail - whether its render throws
 * @returns the renderer and its records
 */
function recordingRenderer(fail = false) {
  let current: WebGLRenderTarget | null = null
  const drawn: {
    target: WebGLRenderTarget | null
    nodes: { visible: boolean; culled: boolean }[]
  }[] = []
  const renderer: UploadRenderer = {
    getRenderTarget: () => current,
    setRenderTarget: (target) => {
      current = target
    },
    render: (scene: Scene) => {
      const nodes: { visible: boolean; culled: boolean }[] = []
      scene.traverse((node) => {
        if (node !== scene) nodes.push({ visible: node.visible, culled: node.frustumCulled })
      })
      drawn.push({ target: current, nodes })
      if (fail) throw new Error('context lost')
    },
  }
  return { renderer, drawn, target: () => current }
}

/**
 * A layer's object: a group, hidden and culled, holding a mesh.
 * @returns the group
 */
function hiddenLayer(): Object3D {
  const group = new Group()
  group.visible = false
  const mesh = new Mesh(new BufferGeometry())
  mesh.frustumCulled = true
  group.add(mesh)
  return group
}

// ATLAS-396: a map prepared in the background sent to the GPU unseen, so its first showing uploads nothing.
describe('createGpuUpload', () => {
  describe('happy path', () => {
    it('draws the objects once into a target of its own, every node drawable for that render', () => {
      const { renderer, drawn } = recordingRenderer()
      createGpuUpload(renderer, new PerspectiveCamera()).upload([hiddenLayer()])
      expect(drawn).toHaveLength(1)
      expect(drawn[0]?.target).toBeInstanceOf(WebGLRenderTarget)
      expect(drawn[0]?.nodes).toEqual([
        { visible: true, culled: false },
        { visible: true, culled: false },
      ])
    })
  })

  describe('variants', () => {
    it('puts every node back as it was, and leaves the objects off every scene', () => {
      const { renderer } = recordingRenderer()
      const layer = hiddenLayer()
      createGpuUpload(renderer, new PerspectiveCamera()).upload([layer])
      const mesh = layer.children[0]
      expect([layer.visible, mesh?.frustumCulled, layer.parent]).toEqual([false, true, null])
    })

    it('draws into the canvas again after, or into whatever target was set', () => {
      const { renderer, target } = recordingRenderer()
      const before = new WebGLRenderTarget(4, 4)
      renderer.setRenderTarget(before)
      createGpuUpload(renderer, new PerspectiveCamera()).upload([hiddenLayer()])
      expect(target()).toBe(before)
    })

    // Reviews QUAL-001, ARCH-001: a blur's quad, hidden until its blur is on, runs a whole blur pass from its hook.
    it('leaves hidden a node with a hook of its own before it is drawn', () => {
      const { renderer, drawn } = recordingRenderer()
      const layer = hiddenLayer()
      const quad = new Mesh(new BufferGeometry())
      quad.visible = false
      quad.onBeforeRender = vi.fn()
      layer.add(quad)
      createGpuUpload(renderer, new PerspectiveCamera()).upload([layer])
      expect(drawn[0]?.nodes.map(({ visible }) => visible)).toEqual([true, true, false])
    })

    it('reuses its one target from one upload to the next', () => {
      const { renderer, drawn } = recordingRenderer()
      const upload = createGpuUpload(renderer, new PerspectiveCamera())
      upload.upload([hiddenLayer()])
      upload.upload([hiddenLayer()])
      expect(drawn[0]?.target).toBe(drawn[1]?.target)
    })
  })

  // L3: N/A — nothing is refused; what the renderer throws goes on, below.

  describe('unmanaged errors', () => {
    it('puts the target and the nodes back when the render throws, and throws on', () => {
      const { renderer, target } = recordingRenderer(true)
      const layer = hiddenLayer()
      expect(() => {
        createGpuUpload(renderer, new PerspectiveCamera()).upload([layer])
      }).toThrow('context lost')
      expect([target(), layer.visible, layer.parent]).toEqual([null, false, null])
    })
  })

  describe('edge cases', () => {
    it('draws nothing for no object', () => {
      const { renderer, drawn } = recordingRenderer()
      createGpuUpload(renderer, new PerspectiveCamera()).upload([])
      expect(drawn).toEqual([])
    })

    it('frees its target at teardown, and makes a new one if asked again', () => {
      const { renderer, drawn } = recordingRenderer()
      const upload = createGpuUpload(renderer, new PerspectiveCamera())
      upload.upload([hiddenLayer()])
      const first = drawn[0]?.target
      if (first === undefined || first === null) throw new Error('test: no target drawn into')
      const dispose = vi.spyOn(first, 'dispose')
      upload.dispose()
      upload.upload([hiddenLayer()])
      expect([dispose.mock.calls.length, drawn[1]?.target === first]).toEqual([1, false])
    })
  })
})
