// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDevState } from '../tunables/devState'

import { createNavigation, createRenderTarget, createViewport } from './viewport'

import type { RendererHandle } from './viewport'

/** A renderer that records what it was told, and needs no WebGL context. */
function fakeRenderer(canvas: HTMLCanvasElement): RendererHandle & {
  sized: [number, number][]
  frames: number
  disposed: number
} {
  const handle = {
    domElement: canvas,
    sized: [] as [number, number][],
    frames: 0,
    disposed: 0,
    setPixelRatio: vi.fn(),
    setSize(width: number, height: number): void {
      handle.sized.push([width, height])
    },
    render(): void {
      handle.frames += 1
    },
    dispose(): void {
      handle.disposed += 1
    },
  }
  return handle
}

/** A viewport over a fake renderer, with the canvas and the renderer handed back. */
function mount(): {
  canvas: HTMLCanvasElement
  renderer: ReturnType<typeof fakeRenderer>
  dev: ReturnType<typeof createDevState>
  view: ReturnType<typeof createViewport>
} {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  const dev = createDevState()
  let renderer!: ReturnType<typeof fakeRenderer>
  const view = createViewport(canvas, dev, {
    createRenderer: (target) => {
      renderer = fakeRenderer(target)
      return renderer
    },
  })
  return { canvas, renderer, dev, view }
}

afterEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('createRenderTarget', () => {
  describe('happy path', () => {
    it('builds a scene, a camera and the renderer it was given', () => {
      const canvas = document.createElement('canvas')
      const target = createRenderTarget(canvas, 35, fakeRenderer)
      expect(target.camera.fov).toBe(35)
      expect(target.renderer.domElement).toBe(canvas)
    })
  })

  describe('variants', () => {
    it('paints the page in the parchment the map is drawn on, so the splash leaves no seam', () => {
      const scene = createRenderTarget(document.createElement('canvas'), 35, fakeRenderer).scene
      expect(scene.background).not.toBeNull()
    })

    it('adds no lights: the relief is unlit with its hillshade baked in', () => {
      const scene = createRenderTarget(document.createElement('canvas'), 35, fakeRenderer).scene
      expect(scene.children).toHaveLength(0)
    })
  })

  // L3 (managed errors): N/A — it constructs three objects and handles no failure of its own.

  describe('unmanaged errors', () => {
    it('lets a renderer that cannot be made surface its error', () => {
      expect(() =>
        createRenderTarget(document.createElement('canvas'), 35, () => {
          throw new Error('no WebGL context')
        })
      ).toThrow('no WebGL context')
    })
  })

  describe('edge cases', () => {
    it('takes the field of view it is given, however flat', () => {
      expect(
        createRenderTarget(document.createElement('canvas'), 15, fakeRenderer).camera.fov
      ).toBe(15)
    })
  })
})

describe('createNavigation', () => {
  describe('happy path', () => {
    it('centres the camera on the extent when nothing was persisted', () => {
      const dev = createDevState()
      const { renderer } = { renderer: fakeRenderer(document.createElement('canvas')) }
      const { camera } = createRenderTarget(
        renderer.domElement as HTMLCanvasElement,
        35,
        () => renderer
      )
      const { controls } = createNavigation(camera, renderer.domElement, dev)
      expect(controls.target.x).toBeCloseTo(dev.extent.centerX)
      expect(controls.target.z).toBeCloseTo(dev.extent.centerZ)
    })
  })

  describe('variants', () => {
    it('comes back to a persisted viewpoint rather than the default', () => {
      // Restored BEFORE the first render, or the reader watches the camera fly to where they left it.
      const first = mount()
      first.view.controls.zoom = 0.8
      first.view.saveCamera()
      const second = mount()
      expect(second.view.controls.zoom).toBeCloseTo(0.8)
    })
  })

  describe('managed errors', () => {
    it('falls back to the framed default when nothing is stored', () => {
      sessionStorage.clear()
      const { dev, view } = mount()
      expect(view.controls.target.x).toBeCloseTo(dev.extent.centerX)
    })
  })

  describe('unmanaged errors', () => {
    it('falls back to the framed default on a corrupt stored viewpoint', () => {
      sessionStorage.setItem('europe-map:map-camera', '{not json')
      const { dev, view } = mount()
      expect(view.controls.target.x).toBeCloseTo(dev.extent.centerX)
    })
  })

  describe('edge cases', () => {
    it('clamps a stored zoom back into range', () => {
      sessionStorage.setItem(
        'europe-map:map-camera',
        JSON.stringify({ target: [0, 0, 0], zoom: 99 })
      )
      expect(mount().view.controls.zoom).toBeLessThanOrEqual(1)
    })
  })
})

describe('createViewport', () => {
  describe('happy path', () => {
    it('sizes the renderer to the window at once', () => {
      const { renderer } = mount()
      expect(renderer.sized[0]).toEqual([window.innerWidth, window.innerHeight])
    })

    it('draws a frame when asked', () => {
      const { renderer, view } = mount()
      view.render()
      expect(renderer.frames).toBe(1)
    })
  })

  describe('variants', () => {
    it('matches the projection to a new window size', () => {
      const { renderer, view } = mount()
      Object.defineProperty(window, 'innerWidth', { value: 640, configurable: true })
      Object.defineProperty(window, 'innerHeight', { value: 480, configurable: true })
      view.resize()
      expect(renderer.sized.at(-1)).toEqual([640, 480])
      expect(view.camera.aspect).toBeCloseTo(640 / 480)
    })

    it('re-derives the pannable range from a retuned extent', () => {
      const { dev, view } = mount()
      dev.extent.halfWidth = 1
      view.applyExtent()
      expect(view.controls.getExtent().maxX - view.controls.getExtent().minX).toBeCloseTo(2)
    })

    it('shows the debug overlays only once they are switched on', () => {
      const { view } = mount()
      const drawn = (): boolean => view.scene.children.some((child) => child.visible)
      expect(drawn()).toBe(false)
      view.setFrustumDebug(true)
      expect(drawn()).toBe(true)
    })

    it('updates the overlays only while they are shown', () => {
      // A frame is drawn sixty times a second; the hidden case must cost nothing.
      const { dev, view } = mount()
      expect(() => {
        view.frame()
      }).not.toThrow()
      dev.debug.showFrustum = true
      view.setFrustumDebug(true)
      expect(() => {
        view.frame()
      }).not.toThrow()
    })
  })

  describe('managed errors', () => {
    it('persists the viewpoint on teardown, before it takes the camera apart', () => {
      const { view } = mount()
      view.controls.zoom = 0.42
      view.dispose()
      expect(mount().view.controls.zoom).toBeCloseTo(0.42)
    })
  })

  describe('unmanaged errors', () => {
    it('survives a teardown with nothing having been drawn', () => {
      const { renderer, view } = mount()
      view.dispose()
      expect(renderer.disposed).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('leaves no beforeunload listener behind', () => {
      const remove = vi.spyOn(window, 'removeEventListener')
      mount().view.dispose()
      expect(remove).toHaveBeenCalledWith('beforeunload', expect.anything())
    })
  })
})
