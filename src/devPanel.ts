import GUI from 'lil-gui'

import {
  CAMERA_CONTROLS,
  CAMERA_CONTROL_ORDER,
  COASTLINE_CONTROLS,
  COASTLINE_CONTROL_ORDER,
  EXTENT_CONTROLS,
  EXTENT_CONTROL_ORDER,
  FRAME_CONTROLS,
  FRAME_CONTROL_ORDER,
  POLITICAL_CONTROLS,
  POLITICAL_CONTROL_GROUPS,
  RELIEF_CONTROLS,
  RELIEF_CONTROL_ORDER,
  RHUMB_CONTROLS,
  RHUMB_CONTROL_ORDER,
  RIVER_CONTROLS,
  RIVER_CONTROL_ORDER,
  ROSE_CONTROLS,
  ROSE_CONTROL_ORDER,
  politicalRebuildFor,
} from './devParams'
import { TERRAIN_CONTROLS, TERRAIN_CONTROL_GROUPS } from './pipeline/terrainCompose'

import type { MapControlsOptions } from './controls/mapControls'
import type {
  CoastlineDevParams,
  ExtentDevParams,
  FrameDevParams,
  PoliticalDevParams,
  PoliticalRebuild,
  ReliefDevParams,
  RhumbDevParams,
  RiverDevParams,
  RoseDevParams,
} from './devParams'
import type { TerrainTextureOptions } from './pipeline/terrainCompose'
import type { ControlSpec } from './utils/controlSpec'

export type {
  CameraTuningParams,
  CoastlineDevParams,
  PoliticalDevParams,
  ExtentDevParams,
  ReliefDevParams,
  RhumbDevParams,
  RiverDevParams,
  RoseDevParams,
} from './devParams'

/**
 * Render one declared control into a lil-gui folder. The spec says what the control *is*; the caller
 * says what it *does* — ranges are domain knowledge, side effects are wiring, and they stay apart.
 * @param folder - the lil-gui folder to add to
 * @param target - the live object the control mutates in place
 * @param key - the field to bind
 * @param spec - how that field should be presented
 * @param onChange - the side effect to run, on release for anything that rebuilds
 * @param live - bind to `onChange` instead of `onFinishChange` (cheap updates that should track the drag)
 * @returns nothing; the control is added to `folder`
 */
function addControl<T extends object>(
  folder: GUI,
  target: T,
  key: keyof T & string,
  spec: ControlSpec,
  onChange: () => void,
  live = false
): void {
  const controller =
    spec.kind === 'number'
      ? folder.add(target, key, spec.min, spec.max, spec.step)
      : spec.kind === 'color'
        ? folder.addColor(target, key, 255)
        : spec.kind === 'hexColor'
          ? folder.addColor(target, key)
          : spec.kind === 'choice'
            ? folder.add(target, key, [...spec.options])
            : folder.add(target, key)
  controller.name(spec.label)
  if (live) controller.onChange(onChange)
  else controller.onFinishChange(onChange)
}

/**
 * Side effects the panel triggers on the live scene (implemented by the composition root, which owns the
 * mutable relief/coastline/camera handles).
 */
export interface DevPanelCallbacks {
  /** Rebuild the relief geometry (height curve / smoothing changed). */
  rebuildRelief: () => void
  /** Regenerate the terrain texture (a full pixel pass). */
  rebuildTexture: () => void
  /** Rebuild the coastline geometry (jitter / strokes / seaLevel changed). */
  rebuildCoastline: () => void
  /** Rebuild the rhumb network (centre / layout / seaLevel changed). */
  rebuildRhumb: () => void
  /** Rebuild the river network (lake filter / jitter changed). */
  rebuildRivers: () => void
  /** Reload and re-rasterise the political overlay (year or colouring changed). */
  rebuildPolitical: () => void
  /** Redraw the border lines from the geometry already traced (styling changed). */
  rebuildBorders: () => void
  /** Trace the border lines again from the political grid already held (smoothing changed). */
  rebuildBorderGeometry: () => void
  /** Update the live river material colour. */
  setRiverColor: (color: string) => void
  /** Rebuild the compass rose (colours / labels / size / lift changed). */
  rebuildRose: () => void
  /** Rebuild the sheet and the graduated border framing the map. */
  rebuildFrame: () => void
  /** Update the live compass-rose opacity. */
  setRoseOpacity: (value: number) => void
  /** Toggle the relief wireframe on the live material. */
  setWireframe: (value: boolean) => void
  /** Update the live coastline material colour. */
  setCoastColor: (color: string) => void
  /** Update the live rhumb-network material colour. */
  setRhumbColor: (color: string) => void
  /** Apply a new camera field of view. */
  setFov: (value: number) => void
  /** Re-apply the extent to the controls (centre / half-size changed). */
  applyExtent: () => void
  /** Show / hide the extent + frustum-footprint debug rectangles. */
  setFrustumDebug: (value: boolean) => void
  /** Log every tunable value (paste back as defaults). */
  logAll: () => void
  /** Log the current camera state. */
  logCameraState: () => void
}

/**
 * Everything the dev panel binds to: the mutable param objects (edited in place by lil-gui) plus the
 * side-effect callbacks. Keeps `main.ts` focused on the pipeline + render loop.
 */
export interface DevPanelDeps {
  /** Relief tuning params. */
  relief: ReliefDevParams
  /** Terrain texture options. */
  texture: TerrainTextureOptions
  /** Coastline styling params. */
  coast: CoastlineDevParams
  /** Rhumb-network styling + layout params. */
  rhumb: RhumbDevParams
  /** River-network styling + level of detail. */
  river: RiverDevParams
  /** Historical political overlay params. */
  political: PoliticalDevParams
  /** Compass-rose styling params. */
  rose: RoseDevParams
  /** The sheet the map is printed on, and its graduated border. */
  frame: FrameDevParams
  /** The live controls options object (mutated in place, read every frame). */
  controlsOptions: MapControlsOptions
  /** The camera framing (fov). */
  framing: { fov: number }
  /** The view-clamp extent params. */
  extent: ExtentDevParams
  /** Debug-overlay toggle state (read every frame by the render loop). */
  debug: { showFrustum: boolean }
  /** Live-scene side effects. */
  callbacks: DevPanelCallbacks
}

/** Deep-clone a plain, JSON-safe settings object (numbers, strings, nested colour objects). */
function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** Snapshot the controls-options fields the camera folder tunes (restored on reset; extent/zoom left be). */
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

/** Some controls need no side effect: the render loop already reads their value every frame. */
const noEffect = (): void => undefined

/** Every tunable as it stood when the panel was built. */
type PanelDefaults = ReturnType<typeof snapshotDefaults>

/**
 * Snapshot the defaults while the live objects still hold them.
 *
 * Taken at build time rather than re-imported from `devParams`, so "reset" restores what this session
 * actually started from — which is the same thing today and would not be if a caller ever seeded the
 * panel from a saved look.
 * @param deps - what the panel binds to
 * @returns the snapshot
 */
function snapshotDefaults(deps: DevPanelDeps) {
  return {
    relief: clonePlain(deps.relief),
    texture: clonePlain(deps.texture),
    coast: clonePlain(deps.coast),
    rhumb: clonePlain(deps.rhumb),
    river: clonePlain(deps.river),
    political: clonePlain(deps.political),
    rose: clonePlain(deps.rose),
    frame: clonePlain(deps.frame),
    extent: clonePlain(deps.extent),
    fov: deps.framing.fov,
    // Camera tuning is a subset of the controls options; extent and zoom state are left alone.
    camera: cameraTuningOf(deps.controlsOptions),
  }
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
function createResetAction(gui: GUI, deps: DevPanelDeps, defaults: PanelDefaults): () => void {
  const { relief, texture, coast, rhumb, river, political, rose, frame, extent, callbacks } = deps
  return (): void => {
    Object.assign(relief, clonePlain(defaults.relief))
    Object.assign(texture, clonePlain(defaults.texture))
    Object.assign(coast, clonePlain(defaults.coast))
    Object.assign(rhumb, clonePlain(defaults.rhumb))
    Object.assign(river, clonePlain(defaults.river))
    Object.assign(political, clonePlain(defaults.political))
    Object.assign(rose, clonePlain(defaults.rose))
    Object.assign(frame, clonePlain(defaults.frame))
    Object.assign(extent, clonePlain(defaults.extent))
    Object.assign(deps.controlsOptions, clonePlain(defaults.camera))
    deps.framing.fov = defaults.fov
    callbacks.setWireframe(relief.wireframe)
    callbacks.setCoastColor(coast.color)
    callbacks.setRhumbColor(rhumb.color)
    callbacks.setRiverColor(river.color)
    callbacks.setRoseOpacity(rose.opacity)
    callbacks.setFov(defaults.fov)
    callbacks.applyExtent()
    callbacks.rebuildTexture()
    callbacks.rebuildRelief()
    callbacks.rebuildCoastline()
    callbacks.rebuildRhumb()
    callbacks.rebuildRivers()
    callbacks.rebuildPolitical()
    callbacks.rebuildRose()
    callbacks.rebuildFrame()
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay())
  }
}

/**
 * Relief, at the top level rather than in a folder: it is what the reader is looking at.
 *
 * Exaggeration is applied every frame in the loop (a cheap `scale.y`, no geometry); the height-curve
 * knobs need a geometry rebuild; the wireframe flips the live material.
 * @param gui - where to add the controls
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addReliefControls(gui: GUI, deps: DevPanelDeps): void {
  const { relief, callbacks } = deps
  const effect = (key: keyof ReliefDevParams): (() => void) =>
    key === 'wireframe'
      ? (): void => {
          callbacks.setWireframe(relief.wireframe)
        }
      : key === 'exaggeration' || key === 'exaggZoomIn'
        ? noEffect
        : callbacks.rebuildRelief
  for (const key of RELIEF_CONTROL_ORDER)
    addControl(gui, relief, key, RELIEF_CONTROLS[key], effect(key), key === 'wireframe')
}

/**
 * The terrain look, in sub-folders mirroring the compositing order.
 *
 * Regenerating the texture is a full pixel pass, so tuning fires on release. The shoreline is shared:
 * the coastline and the sea-clipped rhumbs sit on the same iso-line, so moving it rebuilds them too.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addTextureFolder(gui: GUI, deps: DevPanelDeps): void {
  const { texture, callbacks } = deps
  const folder = gui.addFolder('texture (parchment)')
  const onSeaLevelChange = (): void => {
    callbacks.rebuildTexture()
    callbacks.rebuildCoastline()
    callbacks.rebuildRhumb()
  }
  for (const group of TERRAIN_CONTROL_GROUPS) {
    const sub = folder.addFolder(group.title)
    for (const key of group.keys) {
      const onChange = key === 'seaLevel' ? onSeaLevelChange : callbacks.rebuildTexture
      addControl(sub, texture, key, TERRAIN_CONTROLS[key], onChange)
    }
    sub.close()
  }
  folder.close()
}

/**
 * The drawn shoreline. Colour is a live material tweak; jitter and strokes rebuild the geometry;
 * opacity is read every frame, so it needs no callback at all.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addCoastlineFolder(gui: GUI, deps: DevPanelDeps): void {
  const { coast, callbacks } = deps
  const folder = gui.addFolder('coastline')
  const effect = (key: keyof CoastlineDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setCoastColor(coast.color)
        }
      : key === 'opacity' || key === 'opacityZoomIn'
        ? noEffect
        : callbacks.rebuildCoastline
  for (const key of COASTLINE_CONTROL_ORDER)
    addControl(folder, coast, key, COASTLINE_CONTROLS[key], effect(key), key === 'color')
  folder.close()
}

/**
 * The portolan rhumb web. Centre and layout regenerate it; colour is live; opacity fades in the loop.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addRhumbFolder(gui: GUI, deps: DevPanelDeps): void {
  const { rhumb, callbacks } = deps
  const folder = gui.addFolder('decor (rhumbs)')
  const effect = (key: keyof RhumbDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setRhumbColor(rhumb.color)
        }
      : key === 'opacity' || key === 'opacityZoomIn'
        ? noEffect
        : callbacks.rebuildRhumb
  for (const key of RHUMB_CONTROL_ORDER)
    addControl(folder, rhumb, key, RHUMB_CONTROLS[key], effect(key), key === 'color')
  folder.close()
}

/**
 * The river network.
 *
 * Everything but the colour is baked into the layer when it is built — the reveal thresholds and the
 * opacity are read from the options the layer captured, and a stroke width is fixed at material
 * construction. So every one of them needs a rebuild; only the colour has a live setter. This is the
 * hole a previous session's inert sliders went through.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addRiverFolder(gui: GUI, deps: DevPanelDeps): void {
  const { river, callbacks } = deps
  const folder = gui.addFolder('rivers')
  const effect = (key: keyof RiverDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setRiverColor(river.color)
        }
      : callbacks.rebuildRivers
  for (const key of RIVER_CONTROL_ORDER)
    addControl(folder, river, key, RIVER_CONTROLS[key], effect(key), key === 'color')
  folder.close()
}

/**
 * The historical political overlay.
 *
 * Which rebuild each tunable needs is declared in `devParams`, beside the control table itself, so it
 * can be walked key by key in a test — this panel has none, and that routing is exactly what broke
 * silently twice. Here we only turn that answer into a callback.
 *
 * Grouped like the texture folder: a flat list of twenty-odd tunables stops being a panel and becomes a
 * haystack, and the first thing lost is knowing which knob to reach for.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addPoliticalFolder(gui: GUI, deps: DevPanelDeps): void {
  const { political, callbacks } = deps
  const folder = gui.addFolder('political (historical)')
  const effects: Record<PoliticalRebuild, () => void> = {
    redraw: callbacks.rebuildBorders,
    trace: callbacks.rebuildBorderGeometry,
    full: callbacks.rebuildPolitical,
  }
  for (const group of POLITICAL_CONTROL_GROUPS) {
    const sub = folder.addFolder(group.title)
    for (const key of group.keys)
      addControl(sub, political, key, POLITICAL_CONTROLS[key], effects[politicalRebuildFor(key)])
    sub.close()
  }
  folder.close()
}

/**
 * The compass rose. Colours, labels and size are baked into its SVG, so each change regenerates it;
 * opacity is the exception, being a live material tweak.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addRoseFolder(gui: GUI, deps: DevPanelDeps): void {
  const { rose, callbacks } = deps
  const folder = gui.addFolder('compass rose')
  const effect = (key: keyof RoseDevParams): (() => void) =>
    key === 'opacity'
      ? (): void => {
          callbacks.setRoseOpacity(rose.opacity)
        }
      : callbacks.rebuildRose
  for (const key of ROSE_CONTROL_ORDER)
    addControl(
      folder,
      rose,
      key,
      ROSE_CONTROLS[key],
      effect(key),
      key === 'opacity' || key === 'showLabels'
    )
  folder.close()
}

/**
 * The sheet and its graduated border.
 *
 * Every tunable rebuilds both: the border's place is decided by the map's own edge and the sheet is
 * what it is drawn on, so there is no half of this that can change alone.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addFrameFolder(gui: GUI, deps: DevPanelDeps): void {
  const folder = gui.addFolder('sheet + border')
  for (const key of FRAME_CONTROL_ORDER)
    addControl(folder, deps.frame, key, FRAME_CONTROLS[key], deps.callbacks.rebuildFrame)
  folder.close()
}

/**
 * The camera feel, and the extent its clamp works from.
 *
 * The controls read their options every frame, so none of these needs a callback — except the extent,
 * which the frustum clamp has to be told about.
 * @param gui - where to add the folder
 * @param deps - what the panel binds to
 * @returns nothing
 */
function addCameraFolder(gui: GUI, deps: DevPanelDeps): void {
  const { controlsOptions, framing, extent, debug, callbacks } = deps
  const folder = gui.addFolder('camera')
  for (const key of CAMERA_CONTROL_ORDER)
    addControl(folder, controlsOptions, key, CAMERA_CONTROLS[key], noEffect)
  folder.add(framing, 'fov', 15, 60, 1).name('fov (lower = flatter)').onChange(callbacks.setFov)

  const extentFolder = folder.addFolder('extent (view limit)')
  for (const key of EXTENT_CONTROL_ORDER)
    addControl(extentFolder, extent, key, EXTENT_CONTROLS[key], callbacks.applyExtent, true)
  extentFolder
    .add(debug, 'showFrustum')
    .name('show extent + footprint')
    .onChange(callbacks.setFrustumDebug)
  folder.add({ logState: callbacks.logCameraState }, 'logState').name('log camera state')
  folder.close()
}

/**
 * Build the lil-gui dev panel, wiring each control to its param object and side-effect callback.
 *
 * The panel is a keeper: a toggleable, extensible debug tool. Grow it here — one function per folder —
 * not inline in the composition root.
 * @param deps - the param objects + side-effect callbacks
 * @returns the `GUI` instance (caller calls `gui.destroy()` on teardown)
 */
export function createDevPanel(deps: DevPanelDeps): GUI {
  const gui = new GUI({ title: 'europe-map · dev' })
  const defaults = snapshotDefaults(deps)

  // Dump every tunable value at once so a tuned look can be pasted back as defaults.
  gui.add({ logAll: deps.callbacks.logAll }, 'logAll').name('⤓ log ALL settings')
  gui
    .add({ resetToDefaults: createResetAction(gui, deps, defaults) }, 'resetToDefaults')
    .name('↺ reset to defaults')

  addReliefControls(gui, deps)
  addTextureFolder(gui, deps)
  addCoastlineFolder(gui, deps)
  addRhumbFolder(gui, deps)
  addRiverFolder(gui, deps)
  addPoliticalFolder(gui, deps)
  addRoseFolder(gui, deps)
  addFrameFolder(gui, deps)
  addCameraFolder(gui, deps)
  return gui
}
