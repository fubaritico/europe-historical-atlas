/**
 * "Reset to defaults": the settings as they stood when the panel was built, and the one-pass restore.
 */

import type { DevPanelDeps } from './panelContract'
import type { MapControlsOptions } from '../controls/controlsState'
import type GUI from 'lil-gui'

/**
 * Deep-clone a plain, JSON-safe settings object (numbers, strings, nested colour objects).
 * @param value - the settings object; anything JSON cannot carry (a function, a texture) is lost
 * @returns an independent copy, so tuning the live object never alters it
 */
function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Snapshot the controls-options fields the camera folder tunes (restored on reset; extent/zoom left be).
 * @param o - the live map-controls options
 * @returns a copy of the tuned fields only, speeds, smoothing, drag and edge scroll, distance and pitch
 * limits
 */
function cameraTuningOf(o: MapControlsOptions): Partial<MapControlsOptions> {
  return {
    panSpeed: o.panSpeed,
    zoomSpeed: o.zoomSpeed,
    smoothingTau: o.smoothingTau,
    enableDrag: o.enableDrag,
    enableEdgeScroll: o.enableEdgeScroll,
    edgeScrollSpeed: o.edgeScrollSpeed,
    minDistance: o.minDistance,
    maxDistance: o.maxDistance,
    minPitchDeg: o.minPitchDeg,
    maxPitchDeg: o.maxPitchDeg,
  }
}

/** Every tunable as it stood when the panel was built. */
type PanelDefaults = ReturnType<typeof snapshotDefaults>

/**
 * Snapshot the defaults while the live objects still hold them.
 *
 * Taken at build time rather than re-imported from `tunables/params`, so "reset" restores what this session
 * actually started from — which is the same thing today and would not be if a caller ever seeded the
 * panel from a saved look.
 * @param deps - what the panel binds to
 * @returns the snapshot
 */
export function snapshotDefaults(deps: DevPanelDeps) {
  return {
    relief: clonePlain(deps.relief),
    texture: clonePlain(deps.texture),
    coast: clonePlain(deps.coast),
    rhumb: clonePlain(deps.rhumb),
    river: clonePlain(deps.river),
    political: clonePlain(deps.political),
    vassals: clonePlain(deps.vassals),
    tribes: clonePlain(deps.tribes),
    rose: clonePlain(deps.rose),
    frame: clonePlain(deps.frame),
    extent: clonePlain(deps.extent),
    fov: deps.framing.fov,
    // Camera tuning is a subset of the controls options; extent and zoom state are left alone.
    camera: cameraTuningOf(deps.controlsOptions),
  }
}

/**
 * Copy the defaults back into the live setting objects, cloned so the snapshot stays untouched.
 * @param deps - what the panel binds to, whose objects are written in place
 * @param defaults - the snapshot to restore
 * @returns nothing
 */
function restoreDefaults(deps: DevPanelDeps, defaults: PanelDefaults): void {
  Object.assign(deps.relief, clonePlain(defaults.relief))
  Object.assign(deps.texture, clonePlain(defaults.texture))
  Object.assign(deps.coast, clonePlain(defaults.coast))
  Object.assign(deps.rhumb, clonePlain(defaults.rhumb))
  Object.assign(deps.river, clonePlain(defaults.river))
  Object.assign(deps.political, clonePlain(defaults.political))
  Object.assign(deps.vassals, clonePlain(defaults.vassals))
  Object.assign(deps.tribes, clonePlain(defaults.tribes))
  Object.assign(deps.rose, clonePlain(defaults.rose))
  Object.assign(deps.frame, clonePlain(defaults.frame))
  Object.assign(deps.extent, clonePlain(defaults.extent))
  Object.assign(deps.controlsOptions, clonePlain(defaults.camera))
  deps.framing.fov = defaults.fov
}

/**
 * Put every tunable back to its default, in one pass.
 *
 * One rebuild per system rather than one per controller: lil-gui's own `reset()` fires each control's
 * `onChange` in turn, which on this panel means dozens of full texture bakes in a row.
 * @param gui - the panel, whose widgets are refreshed at the end
 * @param deps - what the panel binds to
 * @param defaults - the snapshot to restore
 * @returns the reset action
 */
export function createResetAction(
  gui: GUI,
  deps: DevPanelDeps,
  defaults: PanelDefaults
): () => void {
  const { relief, coast, rhumb, river, rose, callbacks } = deps
  return (): void => {
    // 1. The defaults back into the live objects.
    restoreDefaults(deps, defaults)
    // 2. Push the values held by live materials and the camera.
    callbacks.setWireframe(relief.wireframe)
    callbacks.setCoastColor(coast.color)
    callbacks.setRhumbColor(rhumb.color)
    callbacks.setRiverColor(river.color)
    callbacks.setRoseOpacity(rose.opacity)
    callbacks.setFov(defaults.fov)
    callbacks.applyExtent()
    // 3. Rebuild each system once.
    callbacks.rebuildTexture()
    callbacks.rebuildRelief()
    callbacks.rebuildCoastline()
    callbacks.rebuildRhumb()
    callbacks.rebuildRivers()
    callbacks.rebuildPolitical()
    callbacks.rebuildRose()
    callbacks.rebuildFrame()
    // 4. Refresh every widget, since the values changed behind lil-gui's back.
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay())
  }
}
