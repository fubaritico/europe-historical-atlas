/**
 * What every dev-panel control does, wired to the map.
 *
 * Its own module because it is the one table that touches all four collaborators at once — the layers,
 * the pipeline, the viewport and the tunables — and that is exactly the kind of thing that used to
 * accumulate in the composition root without ever breaking an import rule (ARCH-012).
 *
 * The dispatch itself lives elsewhere on purpose: which rebuild a *political* tunable needs is declared
 * beside the control table in `devParams`, walked key by key by a test. This module only says what each
 * named action is.
 */

import type { MapControls } from './controls/mapControls'
import type { DevPanelCallbacks, DevPanelDeps } from './devPanel'
import type { DevState } from './devState'
import type { MapPipeline } from './mapPipeline'
import type { MapLayers } from './scene/layers/mapLayers'
import type { Viewport } from './viewport'

/** What the panel drives. */
export interface PanelCallbackDeps {
  /** The live tunables, read for the settings dump. */
  dev: DevState
  /** The overlays, rebuilt and repainted. */
  layers: MapLayers
  /** The compute, re-run. */
  pipeline: MapPipeline
  /** The camera and its debug overlays. */
  view: Viewport
}

/**
 * Print every live setting, so a look tuned on screen can be pasted back in as a default.
 *
 * `console.warn` rather than `log`: the project forbids `console.log`, and this is deliberately loud.
 * @param dev - the live tunables
 * @param controls - the map controls, whose options are tuned in the same panel
 * @returns nothing
 */
function logAllSettings(dev: DevState, controls: MapControls): void {
  console.warn(
    'ALL settings:\n' +
      JSON.stringify(
        {
          relief: dev.relief,
          texture: dev.texture,
          coastline: dev.coast,
          rhumb: dev.rhumb,
          river: dev.river,
          political: dev.political,
          vassals: dev.vassals,
          tribes: dev.tribes,
          rose: dev.rose,
          frame: dev.frame,
          camera: { ...controls.getState(), fov: dev.framing.fov },
          controls: controls.options,
          extent: dev.extent,
        },
        null,
        2
      )
  )
}

/**
 * The actions that cost a rebuild or a recompute.
 * @param deps - what the panel drives
 * @returns that slice of the callbacks
 */
function rebuildCallbacks(
  deps: PanelCallbackDeps
): Pick<
  DevPanelCallbacks,
  | 'rebuildRelief'
  | 'rebuildTexture'
  | 'rebuildCoastline'
  | 'rebuildRhumb'
  | 'rebuildRivers'
  | 'rebuildPolitical'
  | 'rebuildBorders'
  | 'rebuildBorderGeometry'
  | 'rebuildRose'
> {
  const { layers, pipeline } = deps
  return {
    rebuildRelief: (): void => {
      layers.rebuildSurface()
    },
    rebuildTexture: (): void => {
      void pipeline.rebuildTexture().catch((error: unknown) => {
        console.error('terrain bake failed', error)
      })
    },
    rebuildCoastline: (): void => {
      layers.rebuildCoastline()
    },
    rebuildRhumb: (): void => {
      layers.rebuildRhumb()
    },
    rebuildRivers: (): void => {
      layers.rebuildRivers()
    },
    rebuildPolitical: (): void => {
      void pipeline.rebuildPolitical()
    },
    rebuildBorders: (): void => {
      layers.rebuildBorders()
    },
    rebuildBorderGeometry: (): void => {
      void pipeline.rebuildBorderGeometry()
    },
    rebuildRose: (): void => {
      layers.rebuildRose()
    },
  }
}

/**
 * The actions that only change a live material or the camera — no geometry, so they are free.
 * @param deps - what the panel drives
 * @returns that slice of the callbacks
 */
function liveCallbacks(
  deps: PanelCallbackDeps
): Pick<
  DevPanelCallbacks,
  | 'setWireframe'
  | 'setCoastColor'
  | 'setRiverColor'
  | 'setRhumbColor'
  | 'setRoseOpacity'
  | 'setFov'
  | 'applyExtent'
  | 'setFrustumDebug'
> {
  const { layers, view } = deps
  return {
    setWireframe: (value: boolean): void => {
      layers.setWireframe(value)
    },
    setCoastColor: (color: string): void => {
      layers.setCoastColor(color)
    },
    setRiverColor: (color: string): void => {
      layers.setRiverColor(color)
    },
    setRhumbColor: (color: string): void => {
      layers.setRhumbColor(color)
    },
    setRoseOpacity: (value: number): void => {
      layers.setRoseOpacity(value)
    },
    setFov: (value: number): void => {
      view.camera.fov = value
      view.camera.updateProjectionMatrix()
    },
    applyExtent: (): void => {
      view.applyExtent()
    },
    setFrustumDebug: (value: boolean): void => {
      view.setFrustumDebug(value)
    },
  }
}

/**
 * Wire every dev-panel control to the map.
 * @param deps - what the panel drives
 * @returns the callbacks the panel renders against
 */
export function createPanelCallbacks(deps: PanelCallbackDeps): DevPanelCallbacks {
  return {
    ...rebuildCallbacks(deps),
    ...liveCallbacks(deps),
    rebuildFrame: (): void => {
      deps.layers.rebuildFrame()
    },
    logAll: (): void => {
      logAllSettings(deps.dev, deps.view.controls)
    },
    logCameraState: (): void => {
      console.warn('camera state:', JSON.stringify(deps.view.controls.getState()))
    },
  }
}

/**
 * Everything the dev panel renders against: the live tunables, and what each control does.
 *
 * Assembled here rather than in the composition root because it is the same wiring question, and the
 * root's job is to create and connect, not to spell out a dozen field names.
 * @param deps - what the panel drives
 * @returns the panel's dependencies
 */
export function panelDepsFor(deps: PanelCallbackDeps): DevPanelDeps {
  const { dev, view } = deps
  return {
    relief: dev.relief,
    texture: dev.texture,
    coast: dev.coast,
    rhumb: dev.rhumb,
    river: dev.river,
    political: dev.political,
    vassals: dev.vassals,
    tribes: dev.tribes,
    rose: dev.rose,
    frame: dev.frame,
    // The camera folder writes straight into the controls' own options: they are the live values, and
    // a copy here would give the panel two places to write and the camera one to read.
    controlsOptions: view.controls.options,
    framing: dev.framing,
    extent: dev.extent,
    debug: dev.debug,
    callbacks: createPanelCallbacks(deps),
  }
}
