/**
 * Everything drawn over the terrain, behind one handle.
 *
 * These layers were held as separate bindings in the composition root, and that is what made the root
 * grow: each one has to be disposed here, resized there and rescaled every frame, and keeping three
 * loops in step by hand is exactly the tripwire `modular-architecture.md` warns about. One object with
 * `rebuild*`, `setResolution`, `frame` and `dispose` cannot fall out of step with itself.
 *
 * It owns no data. The sources are injected and read live, so a reload or a retuned curve reaches every
 * layer without any of them holding a stale copy.
 */

import { rebuildRhumb } from '../decor/rhumbs/mapRhumbLayer'
import { rebuildRose } from '../decor/rose/mapRoseLayer'
import { rebuildEvents } from '../events/mapEventLayer'
import { rebuildBorders } from '../political/borders/mapBorderLayer'
import { rebuildFills } from '../political/fills/mapFillLayer'
import { rebuildNames } from '../political/names/mapNameLayer'
import { disposeRelief, rebuildRelief, setTexture } from '../relief/mapReliefLayer'
import { rebuildFrame } from '../sheet/mapFrameLayer'
import { rebuildCoastline } from '../waters/mapCoastLayer'
import { rebuildRivers } from '../waters/mapRiverLayer'

import { disposeHandle } from './disposeHandle'
import { frameLineWork, frameRelief } from './frameLayers'
import { createLayerProjection } from './layerProjection'
import { layersWithRole } from './layerRoles'
import { rebuildSurface } from './rebuildSurface'

import type { LayerContext, MapLayersDeps } from './layerContext'
import type { CameraPose } from '../events/markers'
import type { DataTexture, Object3D } from 'three'

/** Every layer drawn on the scene but the relief, which is freed on its own terms. */
const DRAWN_LAYERS = [...layersWithRole('draped'), ...layersWithRole('flat')]

/** The textures held apart from the meshes they hang on. */
const TEXTURES = layersWithRole('texture')

/** The map's overlays, as one thing. */
export interface MapLayers {
  /**
   * Rebuild the terrain mesh. Needed whenever the height curve changes, since that is geometry.
   * @returns nothing
   */
  rebuildRelief: () => void
  /**
   * Hang a freshly baked texture on the relief.
   * @param texture - the baked look; the previous one is disposed
   * @returns nothing
   */
  setTexture: (texture: DataTexture) => void
  /**
   * Retrace and redraw the shoreline.
   * @returns nothing
   */
  rebuildCoastline: () => void
  /**
   * Regenerate and redraw the rhumb web.
   * @returns nothing
   */
  rebuildRhumb: () => void
  /**
   * Redrape the rivers. A no-op until the centrelines land.
   * @returns nothing
   */
  rebuildRivers: () => void
  /**
   * Redraw the political line work from the borders the compute derived.
   * @returns nothing
   */
  rebuildBorders: () => void
  /**
   * Lay an authored year's polities on the relief as geometry, or clear them when the texture carries the
   * colour. Needed after a new year, a new relief or the panel's switch.
   * @returns nothing
   */
  rebuildFills: () => void
  /**
   * Lay the year's country names on the relief (ATLAS-301). A no-op until the names and their sheet are in.
   * @returns nothing
   */
  rebuildNames: () => void
  /**
   * Stand the contribution's events on the relief. A no-op until the events are in and the map is drawn.
   * @returns nothing
   */
  rebuildEvents: () => void
  /**
   * Rebuild the relief, then everything laid on it — the coastline, the rivers, the borders, the fills (and the
   * tribes with them), the names and the events.
   * They read their heights off the relief's grid when they are built, so a new grid leaves them on the
   * old surface: under it in a valley, floating where the shore came down. One method, so the order lives
   * beside the layers rather than in each caller.
   * @returns nothing
   */
  rebuildSurface: () => void
  /**
   * Rebuild the compass rose, whose colours and labels are baked into its SVG.
   * @returns nothing
   */
  rebuildRose: () => void
  /**
   * Rebuild the sheet and the graduated border that frames the map.
   * @returns nothing
   */
  rebuildFrame: () => void
  /**
   * Show the relief as a wireframe.
   * @param value - whether to draw wires instead of the painted surface
   * @returns nothing
   */
  setWireframe: (value: boolean) => void
  /**
   * Repaint the coastline without retracing it.
   * @param color - the new ink
   * @returns nothing
   */
  setCoastColor: (color: string) => void
  /**
   * Repaint the rivers without redraping them.
   * @param color - the new ink
   * @returns nothing
   */
  setRiverColor: (color: string) => void
  /**
   * Repaint the rhumb web without regenerating it.
   * @param color - the new ink
   * @returns nothing
   */
  setRhumbColor: (color: string) => void
  /**
   * Fade the compass rose.
   * @param value - the new opacity
   * @returns nothing
   */
  setRoseOpacity: (value: number) => void
  /**
   * Tell every fat-line layer the viewport size, which its shader needs to size a stroke in pixels.
   * @param width - viewport width in CSS pixels
   * @param height - viewport height in CSS pixels
   * @returns nothing
   */
  setResolution: (width: number, height: number) => void
  /**
   * Bring every layer up to date for this frame's zoom.
   * @param zoom - the camera's zoom in `[0, 1]`, zoomed out at zero
   * @param pixelsPerUnit - screen pixels per world unit where the camera looks (`scene/screenScale`),
   *   which keeps a dash the same size on screen at every zoom
   * @returns nothing
   */
  frame: (zoom: number, pixelsPerUnit: number) => void
  /**
   * Turn the event icons to the camera, so they always show their front, and sway them.
   * @param camera - where the camera stands and how it is turned
   * @param seconds - the time since the map started
   * @returns nothing
   */
  faceCamera: (camera: CameraPose, seconds: number) => void
  /**
   * What a click raycasts against — the terrain itself, or `null` before it is built.
   *
   * A call rather than a handle, because the mesh is replaced whenever the height curve changes: a
   * picker holding the old one would answer about a surface no longer on screen.
   * @returns the relief mesh
   */
  pickTarget: () => Object3D | null
  /** Remove every layer from the scene and free its GPU resources. */
  dispose: () => void
}

/**
 * The calls that rebuild geometry.
 * @param context - the layers and what they read
 * @returns that slice of the handle
 */
function layerRebuilders(
  context: LayerContext
): Pick<
  MapLayers,
  | 'rebuildRelief'
  | 'setTexture'
  | 'rebuildCoastline'
  | 'rebuildRhumb'
  | 'rebuildRivers'
  | 'rebuildBorders'
  | 'rebuildFills'
  | 'rebuildSurface'
  | 'rebuildRose'
  | 'rebuildFrame'
> {
  // Each call hands the shared context to its family's builder.
  return {
    rebuildRelief(): void {
      rebuildRelief(context)
    },
    setTexture(texture: DataTexture): void {
      setTexture(context, texture)
    },
    rebuildCoastline(): void {
      rebuildCoastline(context)
    },
    rebuildRhumb(): void {
      rebuildRhumb(context)
    },
    rebuildRivers(): void {
      rebuildRivers(context)
    },
    rebuildFills(): void {
      rebuildFills(context)
    },
    rebuildSurface(): void {
      rebuildSurface(context)
    },
    rebuildBorders(): void {
      rebuildBorders(context)
    },
    rebuildRose(): void {
      rebuildRose(context)
    },
    rebuildFrame(): void {
      rebuildFrame(context)
    },
  }
}

/**
 * The calls that only repaint — no geometry is touched, so they are free.
 * @param context - the layers and what they read
 * @returns that slice of the handle
 */
function layerSetters(
  context: LayerContext
): Pick<
  MapLayers,
  'setWireframe' | 'setCoastColor' | 'setRiverColor' | 'setRhumbColor' | 'setRoseOpacity'
> {
  const { handles } = context
  // Each setter writes to its live layer, and does nothing while that layer is not built yet.
  return {
    setWireframe(value: boolean): void {
      if (handles.relief) handles.relief.material.wireframe = value
    },
    setCoastColor(color: string): void {
      handles.coastline?.setColor(color)
    },
    setRiverColor(color: string): void {
      handles.rivers?.setColor(color)
    },
    setRhumbColor(color: string): void {
      handles.rhumb?.setColor(color)
    },
    setRoseOpacity(value: number): void {
      if (handles.compass) handles.compass.object.material.opacity = value
    },
  }
}

/**
 * What the frame loop, the resize handler and teardown call.
 * @param context - the layers and what they read
 * @returns that slice of the handle
 */
function layerLifecycle(
  context: LayerContext
): Pick<MapLayers, 'setResolution' | 'frame' | 'faceCamera' | 'dispose' | 'pickTarget'> {
  const { scene, handles } = context
  return {
    setResolution(width: number, height: number): void {
      // Fat lines size their stroke in screen pixels, so the shader needs the new viewport or the width
      // distorts with the aspect ratio.
      handles.rivers?.setResolution(width, height)
      handles.borders?.setResolution(width, height)
    },
    frame(zoom: number, pixelsPerUnit: number): void {
      // The relief's scale first, then the line work, then the event icons, all for this zoom.
      frameRelief(context, zoom)
      frameLineWork(context, zoom, pixelsPerUnit)
      handles.events?.setZoom(zoom, pixelsPerUnit)
    },
    faceCamera(camera: CameraPose, seconds: number): void {
      handles.events?.faceCamera(camera, seconds)
    },
    pickTarget(): Object3D | null {
      return handles.relief
    },
    dispose(): void {
      // Every layer taken off the scene and freed.
      disposeRelief(scene, handles.relief)
      for (const key of DRAWN_LAYERS) disposeHandle(scene, handles[key])
      // The textures last: they are held apart from their meshes, so no mesh disposal frees them.
      for (const key of TEXTURES) handles[key]?.dispose()
      // The blur method they were handed, with whatever it holds across its blurs.
      context.blurMethod.dispose()
    },
  }
}

/**
 * Build the map's overlays. Nothing is drawn until something is rebuilt.
 * @param deps - the scene to draw into, the live tunables and the loaded sources
 * @returns the layers
 */
export function createMapLayers(deps: MapLayersDeps): MapLayers {
  // The one context every builder shares: the deps, the projection, and every handle empty until built.
  const context: LayerContext = {
    ...deps,
    projection: createLayerProjection(deps.dev, deps.sources),
    handles: {
      relief: null,
      edge: null,
      texture: null,
      coastline: null,
      rhumb: null,
      rivers: null,
      borders: null,
      fills: null,
      fillCut: null,
      tribes: null,
      tribeCut: null,
      names: null,
      events: null,
      compass: null,
      sheet: null,
      frame: null,
      labels: null,
      title: null,
      sheetTexture: null,
    },
  }
  // The handle, assembled from its slices over that same context.
  return {
    ...layerRebuilders(context),
    rebuildEvents(): void {
      rebuildEvents(context)
    },
    rebuildNames(): void {
      rebuildNames(context)
    },
    ...layerSetters(context),
    ...layerLifecycle(context),
  }
}
