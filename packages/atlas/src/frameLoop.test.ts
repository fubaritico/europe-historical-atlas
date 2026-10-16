// @vitest-environment jsdom
import { PerspectiveCamera, Vector3 } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { startFrameLoop } from './frameLoop'
import { pixelsPerWorldUnit } from './scene/screenScale'

import type { MapLayers } from './mapLayers'
import type { Viewport } from './viewport'

/**
 * A view whose camera stands `distance` above its target, and layers that record each frame.
 * @param distance - from the camera to the target
 * @returns the view, the layers and what `frame` was called with
 */
function harness(distance: number): {
  view: Viewport
  layers: MapLayers
  frames: [number, number][]
} {
  const camera = new PerspectiveCamera(40, 1, 0.01, 100)
  camera.position.set(0, distance, 0)
  const frames: [number, number][] = []
  const view = {
    camera,
    controls: { update: vi.fn(), zoom: 0.3, target: new Vector3(0, 0, 0) },
    frame: vi.fn(),
    render: vi.fn(),
  } as unknown as Viewport
  const layers = {
    frame: (zoom: number, pixelsPerUnit: number) => frames.push([zoom, pixelsPerUnit]),
  } as unknown as MapLayers
  return { view, layers, frames }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('startFrameLoop', () => {
  it('hands the layers the zoom and the screen pixels per world unit where the camera looks', () => {
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { view, layers, frames } = harness(2)

    const stop = startFrameLoop(view, layers, { update: vi.fn() })
    stop()

    expect(frames).toEqual([[0.3, pixelsPerWorldUnit(2, 40, window.innerHeight)]])
  })

  it('stops by cancelling the frame it asked for', () => {
    vi.stubGlobal('requestAnimationFrame', () => 7)
    const cancel = vi.fn()
    vi.stubGlobal('cancelAnimationFrame', cancel)
    const { view, layers } = harness(1)

    startFrameLoop(view, layers, { update: vi.fn() })()

    expect(cancel).toHaveBeenCalledWith(7)
  })
})
