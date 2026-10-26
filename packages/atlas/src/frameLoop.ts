/**
 * The render loop: one thing with a lifecycle, rather than a timer, a handle and a closure held apart.
 *
 * The order inside it is not arbitrary. The controls move the camera first, then the overlays are
 * brought up to the zoom that resulted — a layer scaled from last frame's zoom lags the terrain by one
 * frame, which reads as the border lines swimming over the relief while the camera moves.
 */

import { Timer } from 'three'

import { pixelsPerWorldUnit } from './scene/screenScale'

import type { MapLayers } from './mapLayers'
import type { Viewport } from './viewport'

/** The slice of the stats overlay the loop drives. */
export interface FrameStats {
  /**
   * Record that a frame has been drawn.
   * @returns nothing
   */
  update: () => void
}

/**
 * Start drawing frames, and hand back the way to stop.
 * @param view - the camera, the scene and the renderer
 * @param layers - the overlays, brought up to date for each frame's zoom
 * @param stats - the frame counter
 * @returns a call that stops the loop; safe to call once
 */
export function startFrameLoop(view: Viewport, layers: MapLayers, stats: FrameStats): () => void {
  const timer = new Timer()
  let handle = 0
  const tick = (): void => {
    timer.update()
    view.controls.update(timer.getDelta())
    const { camera, controls } = view
    layers.frame(
      controls.zoom,
      pixelsPerWorldUnit(
        camera.position.distanceTo(controls.target),
        camera.fov,
        window.innerHeight
      )
    )
    layers.faceCamera(camera, timer.getElapsed())
    view.frame()
    view.render()
    stats.update()
    handle = requestAnimationFrame(tick)
  }
  tick()
  return (): void => {
    cancelAnimationFrame(handle)
  }
}
