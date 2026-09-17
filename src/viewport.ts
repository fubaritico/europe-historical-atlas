/**
 * The window onto the map: renderer, scene, camera, navigation, and the viewpoint that survives a reload.
 *
 * Grouped because they are one thing in practice — nothing here is useful without the others, they are
 * created in one order and torn down in the reverse one, and every one of them has to be told when the
 * window is resized. Holding them separately in the composition root is what made that root grow.
 */

import { Color, PerspectiveCamera, Scene, WebGLRenderer } from 'three'

import { createSessionStorageMapCameraStore } from './controls/mapCameraStore'
import { createMapControls } from './controls/mapControls'
import { DEFAULT_CAMERA_TUNING } from './devParams'
import { extentRect } from './devState'
import { createDebugRect } from './scene/debugRect'
import { prefersReducedMotion } from './utils/motion'

import type { MapControls } from './controls/mapControls'
import type { DevState } from './devState'

/** The parchment the map is drawn on, and the page behind the splash. */
export const PARCHMENT = '#efe6d2'

/** How far the camera can see. Beyond this the map is behind you, not far away. */
const FAR_PLANE = 300

/** Inertia time constant under reduced motion: near zero, so pan and zoom stop dead. */
const REDUCED_MOTION_TAU = 0.02

/** How close to the window edge the pointer starts scrolling the map, in CSS pixels. */
const EDGE_SCROLL_MARGIN = 24

/** A mounted viewport. */
export interface Viewport {
  /** The scene every layer is added to. */
  readonly scene: Scene
  /** The camera, whose `fov` the dev panel tunes live. */
  readonly camera: PerspectiveCamera
  /** Map navigation — arrow pan, wheel zoom, yaw locked north. */
  readonly controls: MapControls
  /**
   * Re-derive the camera's pannable range from the live extent.
   * @returns nothing
   */
  applyExtent(): void
  /**
   * Show or hide the extent and frustum-footprint overlays.
   * @param visible - whether to draw them
   * @returns nothing
   */
  setFrustumDebug(visible: boolean): void
  /**
   * Update the debug overlays for the current frame. Cheap no-op while they are hidden.
   * @returns nothing
   */
  frame(): void
  /**
   * Match the drawing buffer and the projection to the window.
   * @returns nothing
   */
  resize(): void
  /**
   * Draw one frame.
   * @returns nothing
   */
  render(): void
  /**
   * Persist the current viewpoint, so a reload comes back to it with no transition.
   * @returns nothing
   */
  saveCamera(): void
  /** Tear everything down and free the GPU resources. */
  dispose(): void
}

/**
 * The three things three.js needs before anything can be drawn.
 * @param canvas - the canvas to render into
 * @param fov - the camera's vertical field of view in degrees
 * @returns the renderer, the scene and the camera
 */
export function createRenderTarget(
  canvas: HTMLCanvasElement,
  fov: number
): { renderer: WebGLRenderer; scene: Scene; camera: PerspectiveCamera } {
  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)

  const scene = new Scene()
  scene.background = new Color(PARCHMENT)
  // No lights: the relief is unlit with its hillshade baked into the texture, and every overlay is a
  // line. Adding one would flatten the painted look rather than improve it.

  const camera = new PerspectiveCamera(fov, window.innerWidth / window.innerHeight, 0.1, FAR_PLANE)
  return { renderer, scene, camera }
}

/**
 * Build the map navigation and put the camera back where the reader left it.
 *
 * Restored BEFORE the first render, or the reader watches the camera fly from the default to their own
 * viewpoint — which is precisely the transition this exists to remove.
 * @param camera - the camera to drive
 * @param domElement - the element pointer and wheel events are read from
 * @param dev - the live tunables the controls read
 * @returns the controls and a call that persists the current viewpoint
 */
export function createNavigation(
  camera: PerspectiveCamera,
  domElement: HTMLElement,
  dev: DevState
): { controls: MapControls; saveCamera: () => void } {
  const controls = createMapControls(camera, domElement, {
    ...DEFAULT_CAMERA_TUNING,
    extent: extentRect(dev.extent),
    // Honour prefers-reduced-motion by collapsing the inertia rather than disabling the controls:
    // the map still pans and zooms, it simply stops the instant the input does.
    smoothingTau: prefersReducedMotion() ? REDUCED_MOTION_TAU : DEFAULT_CAMERA_TUNING.smoothingTau,
    initialZoom: 0,
    edgeScrollMargin: EDGE_SCROLL_MARGIN,
  })

  const store = createSessionStorageMapCameraStore()
  const persisted = store.load()
  if (persisted) controls.setState(persisted)

  return {
    controls,
    saveCamera: (): void => {
      store.save(controls.getState())
    },
  }
}

/**
 * Build the viewport and restore the persisted viewpoint before the first frame.
 * @param canvas - the canvas to render into
 * @param dev - the live tunables the camera reads
 * @returns the viewport
 */
export function createViewport(canvas: HTMLCanvasElement, dev: DevState): Viewport {
  const { renderer, scene, camera } = createRenderTarget(canvas, dev.framing.fov)
  const { controls, saveCamera } = createNavigation(camera, renderer.domElement, dev)
  window.addEventListener('beforeunload', saveCamera)

  // The extent (red) and the live frustum footprint on the ground (blue), toggled from the panel.
  const extentOverlay = createDebugRect('#c0392b')
  const footprintOverlay = createDebugRect('#2980b9')
  scene.add(extentOverlay.object, footprintOverlay.object)

  return {
    scene,
    camera,
    controls,
    applyExtent(): void {
      controls.setExtent(extentRect(dev.extent))
    },
    setFrustumDebug(visible: boolean): void {
      extentOverlay.setVisible(visible)
      footprintOverlay.setVisible(visible)
    },
    frame(): void {
      if (!dev.debug.showFrustum) return
      extentOverlay.update(controls.getExtent(), 0.05)
      footprintOverlay.update(controls.getFootprint(), 0.05)
    },
    resize(): void {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    },
    render(): void {
      renderer.render(scene, camera)
    },
    saveCamera,
    dispose(): void {
      saveCamera() // capture the exact current viewpoint before anything is taken apart
      window.removeEventListener('beforeunload', saveCamera)
      controls.dispose()
      extentOverlay.dispose()
      footprintOverlay.dispose()
      renderer.dispose()
    },
  }
}
