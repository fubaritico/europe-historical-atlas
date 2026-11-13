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

import { createLatestOnly } from '@europe-historical-atlas/core/utils/latestOnly'

import { rebuildRhumb } from '../decor/rhumbs/mapRhumbLayer'
import { rebuildRose } from '../decor/rose/mapRoseLayer'
import { laySeaNames } from '../decor/seas/mapSeaNameLayer'
import { createDetailState } from '../detail/detailView'
import { rebuildEvents } from '../events/mapEventLayer'
import { rebuildBorders } from '../political/borders/mapBorderLayer'
import { primeFillArrays, rebuildFills } from '../political/fills/mapFillLayer'
import { rebuildNames } from '../political/names/mapNameLayer'
import { primeTribeCut } from '../political/tribes/mapTribeLayer'
import { disposeRelief, rebuildRelief, setTexture } from '../relief/mapReliefLayer'
import { reliefHeights } from '../relief/reliefMesh'
import { rebuildFrame } from '../sheet/mapFrameLayer'
import { rebuildCoastline } from '../waters/mapCoastLayer'
import { rebuildRivers } from '../waters/mapRiverLayer'

import { disposeHandle } from './disposeHandle'
import { frameLineWork, frameRelief } from './frameLayers'
import { createLayerProjection } from './layerProjection'
import { LAYER_ROLES, layersWithRole } from './layerRoles'
import { rebuildSurface } from './rebuildSurface'
import { createObjectIds, createYearShelf, yearStamp } from './yearShelf'

import type { LayerContext, LayerHandles, MapLayersDeps } from './layerContext'
import type { CameraPose } from '../events/markers'
import type { FillArraysKey, ReliefHeights } from '../political/fills/mapFillLayer'
import type { MeasuredTribes } from '../political/tribes/mapTribeLayer'
import type { FillArrays } from '@europe-historical-atlas/core/pipeline/fillBuffers'
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
   * How far the year's layers have come in, `0` hidden to `1` whole — the countries, their borders, their names and
   * the events, faded in together over the relief at startup. The next frame applies it.
   * @param share - the share of their opacity shown
   * @returns nothing
   */
  setReveal: (share: number) => void
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
   * Lay the seas' names (ATLAS-440), fixed, once the relief's frame is known — their face loaded first.
   * @returns nothing; a face that cannot load is said in the console, the map shown without them
   */
  rebuildSeaNames: () => void
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
   * @param seconds - the time since the map started: the levels of detail fade in time, not with the zoom
   * @returns nothing
   */
  frame: (zoom: number, pixelsPerUnit: number, seconds: number) => void
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
  /**
   * Set the year on screen aside, whole — its countries, tribes, hatches, borders and names taken off the scene but kept, its
   * sources emptied — so the next year is built in their place and this one can come back in a frame (ATLAS-333).
   * @param year - the year on screen
   * @returns nothing
   */
  shelveYear: (year: number) => void
  /**
   * Put a year set aside back on screen, when it was built under the settings and on the relief the map has now; the
   * year on screen must have been set aside first.
   * @param year - the year
   * @returns whether it came back; `false` when it must be built
   */
  restoreYear: (year: number) => boolean
  /**
   * Hand the fills their arrays laid in the worker (ATLAS-396), so building them lays nothing on this thread: taken by
   * the next build that reads the very same polities, grid, tints and relief.
   * @param key - what they were laid from
   * @param arrays - the fills' arrays
   * @returns nothing
   */
  primeFillArrays: (key: FillArraysKey, arrays: FillArrays) => void
  /**
   * The relief's height at every grid node, one number a node — what the worker lays the fills on (ATLAS-396) — and the
   * relief they were read from, taken in the same step: fills laid on these heights are this relief's, and no other's,
   * whatever is rebuilt while the worker lays them (reviews QUAL-001, ARCH-001). A copy: the relief keeps its own.
   * @returns the heights and their relief; `null` before the relief is built
   */
  reliefHeights: () => ReliefHeights | null
  /**
   * Hand the tribe layer patches measured elsewhere — in the worker (ATLAS-333) — for the year the sources hold now,
   * so laying them measures nothing on this thread; kept under the settings they were measured with, so a setting
   * moved during the measure has them measured again.
   * @param grid - the relief's subdivision they were measured on
   * @param grid.segX - cells across
   * @param grid.segY - cells down
   * @param measured - one patch per tribe, and the settings they were measured with
   * @returns nothing
   */
  primeTribeCut: (grid: { segX: number; segY: number }, measured: MeasuredTribes) => void
  /**
   * Whether a year is set aside under the settings and on the relief the map has now.
   * @param year - the year
   * @returns whether {@link MapLayers.restoreYear} would bring it back
   */
  holdsYear: (year: number) => boolean
  /**
   * What a year's layers are built under now — the settings and the very relief and texture (`yearStamp`): a year
   * computed ahead under another one is not laid (ATLAS-396).
   * @returns the stamp
   */
  yearStamp: () => string
  /**
   * Free every year set aside but these — the maps either side of the one shown (the dev's video buffer, 2026-11-08).
   * @param years - the years to keep, if they are aside
   * @returns nothing
   */
  keepYears: (years: readonly number[]) => void
  /**
   * Free the year on screen, whatever of it is laid, its sources emptied — a map half laid in the background and failing
   * (review ARCH-004).
   * @returns nothing
   */
  discardYear: () => void
  /**
   * Send a year set aside to the GPU unseen, so its first showing uploads nothing (ATLAS-396).
   * @param year - the year, aside
   * @returns nothing
   */
  uploadYear: (year: number) => void
  /** Remove every layer from the scene and free its GPU resources. */
  dispose: () => void
}

/**
 * How many years the shelf may hold, a ceiling: the window is three maps — the one shown, the one before, the one after
 * (the dev, 2026-11-08 evening: *"like a video player's buffer"*), trimmed by `keepYears` — and a map prepared in the
 * background is built while the one shown is aside too, three years aside for that instant.
 */
export const YEAR_SHELF_CAPACITY = 3

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

/** The viewport last told to the layers, `null` before the first. */
interface ViewportSize {
  /** Its width and height in CSS pixels. */
  size: { width: number; height: number } | null
}

/**
 * The years set aside (ATLAS-333): the shelf, and the stamp of the settings and relief the map has now.
 * @param context - the layers and what they read
 * @param viewport - the viewport last told, for borders put back after a resize made while they were aside
 * @returns that slice of the handle, and the shelf's teardown
 */
function layerYears(
  context: LayerContext,
  viewport: ViewportSize
): Pick<
  MapLayers,
  | 'shelveYear'
  | 'restoreYear'
  | 'holdsYear'
  | 'yearStamp'
  | 'keepYears'
  | 'discardYear'
  | 'uploadYear'
  | 'primeFillArrays'
  | 'primeTribeCut'
> & {
  disposeYears: () => void
} {
  const { scene, handles, dev, sources } = context
  const shelf = createYearShelf({ scene, sources, handles, capacity: YEAR_SHELF_CAPACITY })
  const objectIds = createObjectIds()
  const stamp = (): string =>
    yearStamp(dev, { relief: handles.relief, texture: handles.texture }, objectIds)
  return {
    shelveYear(year: number): void {
      shelf.shelve(year, stamp())
    },
    restoreYear(year: number): boolean {
      if (!shelf.restore(year, stamp())) return false
      const { size } = viewport
      if (size !== null) handles.borders?.setResolution(size.width, size.height)
      // Set aside before the contribution landed, a year has no events (`loadContent` pinned the year shown): pinned now.
      if (handles.events === null) rebuildEvents(context)
      return true
    },
    holdsYear: (year: number): boolean => shelf.holds(year, stamp()),
    yearStamp: stamp,
    keepYears: shelf.keepOnly,
    discardYear: shelf.discard,
    uploadYear(year: number): void {
      context.uploadUnseen(shelf.objectsOf(year))
    },
    primeFillArrays(key, arrays): void {
      primeFillArrays(context, key, arrays)
    },
    primeTribeCut(grid, measured): void {
      primeTribeCut(context, grid, measured)
    },
    disposeYears: shelf.dispose,
  }
}

/**
 * What the frame loop, the resize handler and teardown call.
 * @param context - the layers and what they read
 * @param viewport - where the viewport last told is kept
 * @param disposeYears - frees the years set aside
 * @returns that slice of the handle
 */
function layerLifecycle(
  context: LayerContext,
  viewport: ViewportSize,
  disposeYears: () => void
): Pick<MapLayers, 'setResolution' | 'frame' | 'faceCamera' | 'dispose' | 'pickTarget'> {
  const { scene, handles } = context
  return {
    setResolution(width: number, height: number): void {
      // Fat lines size their stroke in screen pixels, so the shader needs the new viewport or the width
      // distorts with the aspect ratio.
      viewport.size = { width, height }
      handles.rivers?.setResolution(width, height)
      handles.borders?.setResolution(width, height)
    },
    frame(zoom: number, pixelsPerUnit: number, seconds: number): void {
      // The relief's scale first, then the line work, then the event icons, all for this zoom.
      frameRelief(context, zoom)
      frameLineWork(context, zoom, pixelsPerUnit, seconds)
      handles.events?.setZoom(zoom, pixelsPerUnit)
    },
    faceCamera(camera: CameraPose, seconds: number): void {
      handles.events?.faceCamera(camera, seconds)
    },
    pickTarget(): Object3D | null {
      return handles.relief
    },
    dispose(): void {
      // The years set aside first: off the scene already, held by the shelf alone.
      disposeYears()
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
 * The relief's heights and the relief they are read from, in one step (ATLAS-396, reviews QUAL-001, ARCH-001).
 * @param context - the layers, whose handles hold the relief
 * @returns them; `null` before the relief is built
 */
function readReliefHeights(context: LayerContext): ReliefHeights | null {
  const relief = context.handles.relief
  return relief === null ? null : { relief, heights: reliefHeights(relief) }
}

/**
 * Every handle empty, one per layer of the roles' table — so a layer added there is never left out here.
 * @returns the handles, each `null`
 */
function emptyHandles(): LayerHandles {
  return Object.fromEntries(
    Object.keys(LAYER_ROLES).map((key) => [key, null])
  ) as unknown as LayerHandles
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
    handles: emptyHandles(),
    // Whole until a startup hides them to fade them in: a year changed later is drawn at once.
    reveal: { value: 1 },
    // The level of detail the zoom chooses, fading in time toward what it shows.
    detail: createDetailState(),
  }
  // The viewport last told, and the years set aside, shared by the slices that read them.
  const viewport: ViewportSize = { size: null }
  const { disposeYears, ...years } = layerYears(context, viewport)
  // The seas' names are laid after their face loads: only the newest call lays them, never after the teardown.
  const seaNamesTurn = createLatestOnly()
  let disposed = false
  const lifecycle = layerLifecycle(context, viewport, disposeYears)
  // The handle, assembled from its slices over that same context.
  return {
    ...layerRebuilders(context),
    rebuildEvents(): void {
      rebuildEvents(context)
    },
    rebuildSeaNames(): void {
      const mine = seaNamesTurn.begin()
      laySeaNames(context, () => !disposed && mine())
    },
    setReveal(share: number): void {
      context.reveal.value = share
    },
    rebuildNames(): void {
      rebuildNames(context)
    },
    ...layerSetters(context),
    reliefHeights: () => readReliefHeights(context),
    ...years,
    ...lifecycle,
    dispose(): void {
      disposed = true
      lifecycle.dispose()
    },
  }
}
