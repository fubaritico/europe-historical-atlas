import GUI from 'lil-gui'

import {
  CAMERA_CONTROLS,
  CAMERA_CONTROL_ORDER,
  COASTLINE_CONTROLS,
  COASTLINE_CONTROL_ORDER,
  EXTENT_CONTROLS,
  EXTENT_CONTROL_ORDER,
  POLITICAL_CONTROLS,
  POLITICAL_CONTROL_ORDER,
  RELIEF_CONTROLS,
  RELIEF_CONTROL_ORDER,
  RHUMB_CONTROLS,
  RHUMB_CONTROL_ORDER,
  RIVER_CONTROLS,
  RIVER_CONTROL_ORDER,
  ROSE_CONTROLS,
  ROSE_CONTROL_ORDER,
} from './devParams'
import { TERRAIN_CONTROLS, TERRAIN_CONTROL_GROUPS } from './scene/terrainTexture'

import type { MapControlsOptions } from './controls/mapControls'
import type {
  CoastlineDevParams,
  ExtentDevParams,
  PoliticalDevParams,
  ReliefDevParams,
  RhumbDevParams,
  RiverDevParams,
  RoseDevParams,
} from './devParams'
import type { TerrainTextureOptions } from './scene/terrainTexture'
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
  /** Rebuild the border lines only (styling changed). */
  rebuildBorders: () => void
  /** Update the live river material colour. */
  setRiverColor: (color: string) => void
  /** Rebuild the compass rose (colours / labels / size / lift changed). */
  rebuildRose: () => void
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

/**
 * Build the lil-gui dev panel (relief / texture / coastline / camera folders + a global "log all"
 * button), wiring each control to its param object and side-effect callback. The panel is a keeper: a
 * toggleable, extensible debug tool — grow it here, not inline in the composition root.
 * @param deps - the param objects + side-effect callbacks
 * @returns the `GUI` instance (caller calls `gui.destroy()` on teardown)
 */
export function createDevPanel(deps: DevPanelDeps): GUI {
  const {
    relief,
    texture,
    coast,
    rhumb,
    river,
    political,
    rose,
    controlsOptions,
    framing,
    extent,
    debug,
    callbacks,
  } = deps
  const gui = new GUI({ title: 'europe-map · dev' })

  // Some controls need no side effect at all: the render loop already reads their value every frame.
  const noEffect = (): void => undefined

  // Snapshot the defaults NOW — the live objects still hold their initial values — so "reset to
  // defaults" can restore them after any amount of tuning. Camera tuning is a subset of the controls
  // options (extent / zoom state are left alone).
  const defaults = {
    relief: clonePlain(relief),
    texture: clonePlain(texture),
    coast: clonePlain(coast),
    rhumb: clonePlain(rhumb),
    river: clonePlain(river),
    political: clonePlain(political),
    rose: clonePlain(rose),
    extent: clonePlain(extent),
    fov: framing.fov,
    camera: cameraTuningOf(controlsOptions),
  }

  // Restore every tunable to its default, then apply once (a single rebuild per system — not one per
  // controller, which lil-gui's own `reset()` would trigger) and refresh all widget displays.
  const resetToDefaults = (): void => {
    Object.assign(relief, clonePlain(defaults.relief))
    Object.assign(texture, clonePlain(defaults.texture))
    Object.assign(coast, clonePlain(defaults.coast))
    Object.assign(rhumb, clonePlain(defaults.rhumb))
    Object.assign(river, clonePlain(defaults.river))
    Object.assign(political, clonePlain(defaults.political))
    Object.assign(rose, clonePlain(defaults.rose))
    Object.assign(extent, clonePlain(defaults.extent))
    Object.assign(controlsOptions, clonePlain(defaults.camera))
    framing.fov = defaults.fov
    callbacks.setWireframe(relief.wireframe)
    callbacks.setCoastColor(coast.color)
    callbacks.setRhumbColor(rhumb.color)
    callbacks.setRiverColor(river.color)
    callbacks.setRoseOpacity(rose.opacity)
    callbacks.setFov(framing.fov)
    callbacks.applyExtent()
    callbacks.rebuildTexture()
    callbacks.rebuildRelief()
    callbacks.rebuildCoastline()
    callbacks.rebuildRhumb()
    callbacks.rebuildRivers()
    callbacks.rebuildPolitical()
    callbacks.rebuildRose()
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay())
  }

  // Dump every tunable value at once so a tuned look can be pasted back as defaults.
  gui.add({ logAll: callbacks.logAll }, 'logAll').name('⤓ log ALL settings')
  gui.add({ resetToDefaults }, 'resetToDefaults').name('↺ reset to defaults')

  // Relief — exaggeration is applied every frame in the loop (cheap scale.y, no geometry rebuild); the
  // height-curve knobs require a geometry rebuild, and the wireframe flips the live material.
  const reliefEffect = (key: keyof ReliefDevParams): (() => void) =>
    key === 'wireframe'
      ? (): void => {
          callbacks.setWireframe(relief.wireframe)
        }
      : key === 'exaggeration' || key === 'exaggZoomIn'
        ? noEffect
        : callbacks.rebuildRelief
  for (const key of RELIEF_CONTROL_ORDER)
    addControl(gui, relief, key, RELIEF_CONTROLS[key], reliefEffect(key), key === 'wireframe')

  // Terrain look. Regenerating the texture is a full pixel pass (heavy), so tuning fires on release.
  // The shoreline is shared: the coastline and the sea-clipped rhumbs sit on the same iso-line, so
  // changing it has to rebuild them too.
  const texFolder = gui.addFolder('texture (parchment)')
  const onSeaLevelChange = (): void => {
    callbacks.rebuildTexture()
    callbacks.rebuildCoastline()
    callbacks.rebuildRhumb()
  }
  for (const group of TERRAIN_CONTROL_GROUPS) {
    const folder = texFolder.addFolder(group.title)
    for (const key of group.keys) {
      const onChange = key === 'seaLevel' ? onSeaLevelChange : callbacks.rebuildTexture
      addControl(folder, texture, key, TERRAIN_CONTROLS[key], onChange)
    }
    folder.close()
  }
  texFolder.close()

  // Coastline — draped 3D lines. Colour updates the live material; jitter/strokes/lift rebuild the
  // geometry; opacity is applied every frame in the loop, so it needs no callback at all.
  const coastFolder = gui.addFolder('coastline')
  const coastEffect = (key: keyof CoastlineDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setCoastColor(coast.color)
        }
      : key === 'opacity' || key === 'opacityZoomIn'
        ? noEffect
        : callbacks.rebuildCoastline
  for (const key of COASTLINE_CONTROL_ORDER)
    addControl(coastFolder, coast, key, COASTLINE_CONTROLS[key], coastEffect(key), key === 'color')
  coastFolder.close()

  // Decor — portolan rhumb network (sea-only). Centre/layout regenerate the network; colour updates the
  // live material; opacity is applied in the loop (fades on zoom-in).
  const rhumbFolder = gui.addFolder('decor (rhumbs)')
  const rhumbEffect = (key: keyof RhumbDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setRhumbColor(rhumb.color)
        }
      : key === 'opacity' || key === 'opacityZoomIn'
        ? noEffect
        : callbacks.rebuildRhumb
  for (const key of RHUMB_CONTROL_ORDER)
    addControl(rhumbFolder, rhumb, key, RHUMB_CONTROLS[key], rhumbEffect(key), key === 'color')
  rhumbFolder.close()

  // Rivers — Natural Earth centrelines, draped on the terrain and revealed by zoom (one layer per
  // scalerank). Colour is a live material tweak; the reveal thresholds are read every frame; only the
  // lake filter and the jitter change the geometry.
  const riverFolder = gui.addFolder('rivers')
  // Everything but the colour is baked into the layer when it is built — the reveal thresholds and the
  // opacity are read from the options the layer captured, and a stroke width is fixed at material
  // construction. So every one of them needs a rebuild; only the colour has a live setter.
  const riverEffect = (key: keyof RiverDevParams): (() => void) =>
    key === 'color'
      ? (): void => {
          callbacks.setRiverColor(river.color)
        }
      : callbacks.rebuildRivers
  for (const key of RIVER_CONTROL_ORDER)
    addControl(riverFolder, river, key, RIVER_CONTROLS[key], riverEffect(key), key === 'color')
  riverFolder.close()

  // Historical political overlay. Only the line styling can get away with rebuilding the lines alone;
  // everything else — the year, the colouring, how far claims grow, the palette — changes the raster or
  // the tints and has to go all the way through. The list is written as what *may* take the cheap path
  // rather than what must not, so a tunable added later defaults to the correct-but-slower effect
  // instead of silently doing nothing (the hole the inert river sliders went through). The tint's
  // strength and blend mode live in the texture folder, with the layers they are composited among.
  const borderOnly = new Set<keyof PoliticalDevParams>([
    'showBorders',
    'borderSource',
    'borderSmoothing',
    'borderOnTop',
    'borderColor',
    'borderOpacity',
    'borderWidth',
    'borderEdgeColor',
    'borderEdgeWidth',
    'showFrontier',
    'frontierColor',
    'frontierOpacity',
    'frontierWidth',
    'borderDashSize',
    'borderDashGap',
    'borderDoubleGap',
    'borderWidthZoomOut',
    'borderCasingZoom',
  ])
  const politicalFolder = gui.addFolder('political (historical)')
  const politicalEffect = (key: keyof PoliticalDevParams): (() => void) =>
    borderOnly.has(key) ? callbacks.rebuildBorders : callbacks.rebuildPolitical
  for (const key of POLITICAL_CONTROL_ORDER)
    addControl(politicalFolder, political, key, POLITICAL_CONTROLS[key], politicalEffect(key))
  politicalFolder.close()

  // Compass rose — colours/labels/size are baked into the SVG, so each change regenerates the rose.
  // Opacity is the exception: it is a live material tweak.
  const roseFolder = gui.addFolder('compass rose')
  const roseEffect = (key: keyof RoseDevParams): (() => void) =>
    key === 'opacity'
      ? (): void => {
          callbacks.setRoseOpacity(rose.opacity)
        }
      : callbacks.rebuildRose
  for (const key of ROSE_CONTROL_ORDER)
    addControl(
      roseFolder,
      rose,
      key,
      ROSE_CONTROLS[key],
      roseEffect(key),
      key === 'opacity' || key === 'showLabels'
    )
  roseFolder.close()

  // Camera feel — tune the EU4-style pan/zoom live (read every frame by the controls, so no callback).
  const camFolder = gui.addFolder('camera')
  for (const key of CAMERA_CONTROL_ORDER)
    addControl(camFolder, controlsOptions, key, CAMERA_CONTROLS[key], noEffect)
  camFolder.add(framing, 'fov', 15, 60, 1).name('fov (lower = flatter)').onChange(callbacks.setFov)

  // Extent — the world rectangle the frustum-aware clamp keeps the view inside.
  const extentFolder = camFolder.addFolder('extent (view limit)')
  for (const key of EXTENT_CONTROL_ORDER)
    addControl(extentFolder, extent, key, EXTENT_CONTROLS[key], callbacks.applyExtent, true)
  extentFolder
    .add(debug, 'showFrustum')
    .name('show extent + footprint')
    .onChange(callbacks.setFrustumDebug)
  camFolder.add({ logState: callbacks.logCameraState }, 'logState').name('log camera state')
  camFolder.close()

  return gui
}
