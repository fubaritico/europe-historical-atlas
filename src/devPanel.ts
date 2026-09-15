import GUI from 'lil-gui'

import { TERRAIN_CONTROLS, TERRAIN_CONTROL_GROUPS } from './scene/terrainTexture'

import type { MapControlsOptions } from './controls/mapControls'
import type { TerrainTextureOptions } from './scene/terrainTexture'

/**
 * Relief geometry / displacement tuning, exposed live through the dev panel.
 */
export interface ReliefDevParams {
  /** Vertical exaggeration of the relief at full zoom-out (applied via `mesh.scale.y`). */
  exaggeration: number
  /** Exaggeration multiplier at full zoom-in (relief flattens as you zoom in); 1 = no flattening. */
  exaggZoomIn: number
  /** Box-blur radius (grid cells); kills isolated DEM outliers. Keep low to stay crisp. */
  smoothing: number
  /** Elevations up to this (metres) stay 1:1 — plains keep their relief. */
  plainsCeiling: number
  /** Apparent height (metres) the highest peaks ease toward (e.g. 4441 m → ~700 m). Lower = flatter. */
  peakTarget: number
  /** Render the relief as a wireframe. */
  wireframe: boolean
}

/**
 * Coastline styling exposed through the dev panel (draped 3D lines; opacity is zoom-linked in the loop).
 */
export interface CoastlineDevParams {
  /** Line colour (hex string). */
  color: string
  /** Opacity at full zoom-out (`controls.zoom = 0`). */
  opacity: number
  /** Opacity at full zoom-in (`controls.zoom = 1`); lerped every frame. */
  opacityZoomIn: number
  /** World-space lift above the flat sea (avoids z-fighting). */
  yLift: number
  /** Hand-drawn wobble amplitude in world units (keep light). */
  jitter: number
  /** Number of overlaid strokes (overdraw → soft pencil band). */
  strokes: number
}

/**
 * Portolan rhumb-network styling + layout exposed through the dev panel (opacity is zoom-linked in the
 * loop; the network is regenerated when the layout changes).
 */
export interface RhumbDevParams {
  /** Rose centre — normalized U (west→east). */
  centerU: number
  /** Rose centre — normalized V (north→south). */
  centerV: number
  /** Radius (normalized) of the ring of secondary compass centres. */
  circleRadius: number
  /** Number of secondary centres on the ring. */
  nodeCount: number
  /** Compass directions per centre (unique lines = directions / 2). */
  directions: number
  /** Line colour (hex string). */
  color: string
  /** Opacity at full zoom-out. */
  opacity: number
  /** Opacity at full zoom-in (fades to reduce clutter). */
  opacityZoomIn: number
  /** Sampling step along each line for the sea-clip (smaller = finer at the coast, slower to build). */
  clipStep: number
}

/**
 * Compass-rose styling exposed through the dev panel (colours + labels are baked into the SVG, so any
 * change regenerates the rose; it is positioned at the rhumb-network centre).
 */
export interface RoseDevParams {
  /** Rose centre — normalized U (west→east). */
  centerU: number
  /** Rose centre — normalized V (north→south). */
  centerV: number
  /** Side length of the rose quad in world units. */
  size: number
  /** Overall opacity `[0, 1]`. */
  opacity: number
  /** Draw the French 8-wind labels. */
  showLabels: boolean
  /** Principal winds / rings / labels colour (sepia ink). */
  ink: string
  /** Half-wind colour (vert anglais). */
  halfWind: string
  /** Quarter-wind colour (rouge bordeaux). */
  quarterWind: string
  /** World-space lift above the sea. */
  lift: number
}

/**
 * The world rectangle the camera view is clamped within, tuned by centre + half-size.
 */
export interface ExtentDevParams {
  /** Extent centre X. */
  centerX: number
  /** Extent centre Z. */
  centerZ: number
  /** Extent half-width (X). */
  halfWidth: number
  /** Extent half-depth (Z). */
  halfDepth: number
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

/** The compositing blend modes accepted by `TerrainTextureOptions.hillshadeMode` / `tintMode` (drives the two GUI dropdowns). */
const BLEND_MODES = ['multiply', 'overlay', 'softLight', 'normal'] as const

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
    rose,
    controlsOptions,
    framing,
    extent,
    debug,
    callbacks,
  } = deps
  const gui = new GUI({ title: 'europe-map · dev' })

  // Snapshot the defaults NOW — the live objects still hold their initial values — so "reset to
  // defaults" can restore them after any amount of tuning. Camera tuning is a subset of the controls
  // options (extent / zoom state are left alone).
  const defaults = {
    relief: clonePlain(relief),
    texture: clonePlain(texture),
    coast: clonePlain(coast),
    rhumb: clonePlain(rhumb),
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
    Object.assign(rose, clonePlain(defaults.rose))
    Object.assign(extent, clonePlain(defaults.extent))
    Object.assign(controlsOptions, clonePlain(defaults.camera))
    framing.fov = defaults.fov
    callbacks.setWireframe(relief.wireframe)
    callbacks.setCoastColor(coast.color)
    callbacks.setRhumbColor(rhumb.color)
    callbacks.setRoseOpacity(rose.opacity)
    callbacks.setFov(framing.fov)
    callbacks.applyExtent()
    callbacks.rebuildTexture()
    callbacks.rebuildRelief()
    callbacks.rebuildCoastline()
    callbacks.rebuildRhumb()
    callbacks.rebuildRose()
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay())
  }

  // Dump every tunable value at once so a tuned look can be pasted back as defaults.
  gui.add({ logAll: callbacks.logAll }, 'logAll').name('⤓ log ALL settings')
  gui.add({ resetToDefaults }, 'resetToDefaults').name('↺ reset to defaults')

  // Relief — exaggeration is applied every frame in the loop (cheap scale.y, no geometry rebuild); the
  // height-curve knobs require a geometry rebuild.
  gui.add(relief, 'exaggeration', 0, 4, 0.05).name('exaggeration (zoom-out)')
  gui.add(relief, 'exaggZoomIn', 0.1, 1, 0.05).name('exaggeration @ zoom-in')
  gui
    .add(relief, 'smoothing', 0, 8, 1)
    .name('smoothing (outliers)')
    .onFinishChange(callbacks.rebuildRelief)
  gui
    .add(relief, 'plainsCeiling', 0, 1000, 25)
    .name('plains ceiling (m)')
    .onFinishChange(callbacks.rebuildRelief)
  gui
    .add(relief, 'peakTarget', 200, 3000, 25)
    .name('peak target (m)')
    .onFinishChange(callbacks.rebuildRelief)
  gui.add(relief, 'wireframe').onChange(callbacks.setWireframe)

  // Terrain look. Regenerating the texture is a full pixel pass (heavy), so tuning fires on release.
  //
  // Every control below is declared once in `TERRAIN_CONTROLS` / `TERRAIN_CONTROL_GROUPS`, next to the
  // defaults it bounds — this loop only renders that declaration. Ranges and defaults therefore cannot
  // drift apart, and a new option is a compile error until it has a spec.
  const texFolder = gui.addFolder('texture (parchment)')
  const rebuild = callbacks.rebuildTexture

  // The shoreline is shared: the coastline and the sea-clipped rhumbs are drawn at this same iso-line,
  // so they have to be rebuilt alongside the texture.
  const onSeaLevelChange = (): void => {
    rebuild()
    callbacks.rebuildCoastline()
    callbacks.rebuildRhumb()
  }

  for (const group of TERRAIN_CONTROL_GROUPS) {
    const folder = texFolder.addFolder(group.title)
    for (const key of group.keys) {
      const spec = TERRAIN_CONTROLS[key]
      const onChange = key === 'seaLevel' ? onSeaLevelChange : rebuild
      const controller =
        spec.kind === 'number'
          ? folder.add(texture, key, spec.min, spec.max, spec.step)
          : spec.kind === 'color'
            ? folder.addColor(texture, key, 255)
            : spec.kind === 'blend'
              ? folder.add(texture, key, BLEND_MODES)
              : folder.add(texture, key)
      controller.name(spec.label).onFinishChange(onChange)
    }
    folder.close()
  }
  texFolder.close()

  // Coastline — draped 3D lines; light jitter over a few low-opacity strokes = soft pencil. Colour
  // updates the live material; jitter/strokes rebuild the geometry (opacity is applied in the loop).
  const coastFolder = gui.addFolder('coastline')
  coastFolder
    .addColor(coast, 'color')
    .name('colour')
    .onChange(() => {
      callbacks.setCoastColor(coast.color)
    })
  coastFolder.add(coast, 'opacity', 0, 1, 0.05).name('opacity (zoom-out)')
  coastFolder.add(coast, 'opacityZoomIn', 0, 1, 0.05).name('opacity @ zoom-in')
  coastFolder
    .add(coast, 'jitter', 0, 0.02, 0.0005)
    .name('jitter (light)')
    .onFinishChange(callbacks.rebuildCoastline)
  coastFolder
    .add(coast, 'strokes', 1, 6, 1)
    .name('strokes (overdraw)')
    .onFinishChange(callbacks.rebuildCoastline)
  coastFolder
    .add(coast, 'yLift', 0, 0.02, 0.001)
    .name('lift')
    .onFinishChange(callbacks.rebuildCoastline)
  coastFolder.close()

  // Decor — portolan rhumb network (sea-only). Centre/layout regenerate the network; colour updates the
  // live material; opacity is applied in the loop (fades on zoom-in).
  const rhumbFolder = gui.addFolder('decor (rhumbs)')
  rhumbFolder
    .addColor(rhumb, 'color')
    .name('colour')
    .onChange(() => {
      callbacks.setRhumbColor(rhumb.color)
    })
  rhumbFolder.add(rhumb, 'opacity', 0, 0.6, 0.02).name('opacity (zoom-out)')
  rhumbFolder.add(rhumb, 'opacityZoomIn', 0, 0.6, 0.02).name('opacity @ zoom-in')
  rhumbFolder
    .add(rhumb, 'centerU', 0, 1, 0.01)
    .name('centre U (E–W)')
    .onFinishChange(callbacks.rebuildRhumb)
  rhumbFolder
    .add(rhumb, 'centerV', 0, 1, 0.01)
    .name('centre V (N–S)')
    .onFinishChange(callbacks.rebuildRhumb)
  rhumbFolder
    .add(rhumb, 'circleRadius', 0, 0.8, 0.01)
    .name('ring radius')
    .onFinishChange(callbacks.rebuildRhumb)
  rhumbFolder
    .add(rhumb, 'nodeCount', 1, 32, 1)
    .name('centres')
    .onFinishChange(callbacks.rebuildRhumb)
  rhumbFolder
    .add(rhumb, 'directions', 4, 32, 4)
    .name('directions')
    .onFinishChange(callbacks.rebuildRhumb)
  rhumbFolder
    .add(rhumb, 'clipStep', 0.001, 0.02, 0.001)
    .name('sea-clip step')
    .onFinishChange(callbacks.rebuildRhumb)
  rhumbFolder.close()

  // Compass rose — colours/labels/size are baked into the SVG, so each change regenerates the rose (it
  // sits at the rhumb-network centre). Portolan code: principal ink, half-winds green, quarters red.
  const roseFolder = gui.addFolder('compass rose')
  roseFolder
    .add(rose, 'centerU', 0, 1, 0.01)
    .name('centre U (E–W)')
    .onFinishChange(callbacks.rebuildRose)
  roseFolder
    .add(rose, 'centerV', 0, 1, 0.01)
    .name('centre V (N–S)')
    .onFinishChange(callbacks.rebuildRose)
  roseFolder.add(rose, 'size', 0.5, 6, 0.1).name('size').onFinishChange(callbacks.rebuildRose)
  roseFolder
    .add(rose, 'opacity', 0, 1, 0.05)
    .name('opacity')
    .onChange(() => {
      callbacks.setRoseOpacity(rose.opacity)
    })
  roseFolder.add(rose, 'showLabels').name('labels (N · NE · …)').onChange(callbacks.rebuildRose)
  roseFolder.addColor(rose, 'ink').name('ink (principal)').onFinishChange(callbacks.rebuildRose)
  roseFolder
    .addColor(rose, 'halfWind')
    .name('half-winds (green)')
    .onFinishChange(callbacks.rebuildRose)
  roseFolder
    .addColor(rose, 'quarterWind')
    .name('quarter-winds (red)')
    .onFinishChange(callbacks.rebuildRose)
  roseFolder.add(rose, 'lift', 0, 0.05, 0.002).name('lift').onFinishChange(callbacks.rebuildRose)
  roseFolder.close()

  // Camera feel — tune the EU4-style pan/zoom live (read every frame by the controls).
  const camFolder = gui.addFolder('camera')
  camFolder.add(controlsOptions, 'panSpeed', 1, 30, 0.5).name('pan speed')
  camFolder.add(controlsOptions, 'zoomSpeed', 0.005, 0.02, 0.001).name('zoom speed')
  camFolder.add(controlsOptions, 'smoothingTau', 0.02, 0.5, 0.01).name('inertia (s)')
  camFolder.add(controlsOptions, 'enableDrag').name('drag-pan')
  camFolder.add(controlsOptions, 'enableEdgeScroll').name('edge-scroll')
  camFolder.add(controlsOptions, 'edgeScrollSpeed', 1, 30, 0.5).name('edge speed')
  camFolder.add(controlsOptions, 'minDistance', 0.5, 8, 0.25).name('min distance (in)')
  camFolder.add(controlsOptions, 'maxDistance', 2, 15, 0.25).name('max distance (out)')
  camFolder.add(controlsOptions, 'minPitchDeg', 20, 89, 1).name('pitch in (oblique)')
  camFolder.add(controlsOptions, 'maxPitchDeg', 20, 89, 1).name('pitch out (top-down)')
  camFolder.add(framing, 'fov', 15, 60, 1).name('fov (lower = flatter)').onChange(callbacks.setFov)
  const extentFolder = camFolder.addFolder('extent (view limit)')
  extentFolder.add(extent, 'centerX', -6, 6, 0.05).name('centre X').onChange(callbacks.applyExtent)
  extentFolder.add(extent, 'centerZ', -6, 6, 0.05).name('centre Z').onChange(callbacks.applyExtent)
  extentFolder
    .add(extent, 'halfWidth', 0.5, 6, 0.05)
    .name('half width')
    .onChange(callbacks.applyExtent)
  extentFolder
    .add(extent, 'halfDepth', 0.5, 6, 0.05)
    .name('half depth')
    .onChange(callbacks.applyExtent)
  camFolder
    .add(debug, 'showFrustum')
    .name('show extent + footprint')
    .onChange(callbacks.setFrustumDebug)
  camFolder.add({ logState: callbacks.logCameraState }, 'logState').name('log camera state')
  camFolder.close()

  return gui
}
