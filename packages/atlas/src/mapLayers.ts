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

import { lerp } from '@europe-historical-atlas/core/utils/math'

import {
  rebuildBorders,
  rebuildCoastline,
  rebuildFills,
  rebuildFrame,
  rebuildRelief,
  rebuildRhumb,
  rebuildRivers,
  rebuildRose,
  rebuildSurface,
  setTexture,
} from './mapLayerBuilders'
import { createLayerProjection, disposeHandle, disposeRelief } from './mapLayerContext'
import { inlayOpacityScale } from './scene/composedLineLayer'

export { WORLD_WIDTH } from './mapLayerContext'
export type { MapLayersDeps } from './mapLayerContext'

import type { LayerContext, MapLayersDeps } from './mapLayerContext'
import type { DataTexture, Object3D } from 'three'

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
   * Rebuild the relief, then everything laid on it — the coastline, the rivers, the borders and the fills.
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
   * @returns nothing
   */
  frame: (zoom: number) => void
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
 * Track the relief's live exaggeration with everything draped on it.
 *
 * Anything draped is built against an unexaggerated surface, so it has to follow the mesh's `scale.y`.
 * Miss it and the overlay floats by the exaggeration ratio — nothing on a plain, glaringly wrong along a
 * mountain crest, which is exactly where a border tends to run.
 * @param context - the layers and what they read
 * @param zoom - the camera's zoom in `[0, 1]`
 * @returns nothing
 */
function frameRelief(context: LayerContext, zoom: number): void {
  const { dev, handles } = context
  const relief = handles.relief
  if (!relief) return
  // Zoom-linked vertical exaggeration: full at zoom-out, × `exaggZoomIn` at zoom-in.
  relief.scale.setY(dev.relief.exaggeration * (1 - (1 - dev.relief.exaggZoomIn) * zoom))
  handles.edge?.setReliefScale(relief.scale.y)
  if (handles.rivers) handles.rivers.object.scale.setY(relief.scale.y)
  if (handles.borders) handles.borders.object.scale.setY(relief.scale.y)
  if (handles.coastline) handles.coastline.object.scale.setY(relief.scale.y)
  if (handles.fills) handles.fills.object.scale.setY(relief.scale.y)
}

/**
 * Thin, fade and reveal the line work as the camera moves.
 *
 * A weight that reads as a drawn border close up becomes a rope across the continent from far away, and
 * an edging either side of a hairline reads as an alternation rather than as one border. All of it is a
 * live material uniform, so nothing is rebuilt while zooming.
 * @param context - the layers and what they read
 * @param zoom - the camera's zoom in `[0, 1]`
 * @returns nothing
 */
function frameLineWork(context: LayerContext, zoom: number): void {
  const { dev, handles } = context
  handles.rivers?.setZoom(zoom)
  if (handles.borders) {
    // A patterned border holds a plain border's weight at continent scale, then thins to the core's
    // weight close up — hence the ratio rather than a knob: it is the same width the inlay uses.
    const patternAtZoomIn = dev.political.borderWidth / dev.political.borderEdgeWidth
    handles.borders.setWidthScale(
      lerp(dev.political.borderWidthZoomOut, 1, zoom),
      lerp(dev.political.borderWidthZoomOut, patternAtZoomIn, zoom)
    )
    handles.borders.setOpacityScale(lerp(dev.political.borderOpacityZoomOut, 1, zoom))
    handles.borders.setInlayOpacity(inlayOpacityScale(zoom, dev.political.borderInlayZoom))
  }
  handles.coastline?.setOpacity(lerp(dev.coast.opacity, dev.coast.opacityZoomIn, zoom))
  // The rhumb web fades as you zoom in, so it does not clutter the terrain it is drawn over.
  handles.rhumb?.setOpacity(lerp(dev.rhumb.opacity, dev.rhumb.opacityZoomIn, zoom))
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
): Pick<MapLayers, 'setResolution' | 'frame' | 'dispose' | 'pickTarget'> {
  const { scene, handles } = context
  return {
    setResolution(width: number, height: number): void {
      // Fat lines size their stroke in screen pixels, so the shader needs the new viewport or the width
      // distorts with the aspect ratio.
      handles.rivers?.setResolution(width, height)
      handles.borders?.setResolution(width, height)
    },
    frame(zoom: number): void {
      frameRelief(context, zoom)
      frameLineWork(context, zoom)
    },
    pickTarget(): Object3D | null {
      return handles.relief
    },
    dispose(): void {
      disposeRelief(scene, handles.relief)
      disposeHandle(scene, handles.edge)
      disposeHandle(scene, handles.coastline)
      disposeHandle(scene, handles.rhumb)
      disposeHandle(scene, handles.rivers)
      disposeHandle(scene, handles.borders)
      disposeHandle(scene, handles.fills)
      disposeHandle(scene, handles.compass)
      disposeHandle(scene, handles.sheet)
      disposeHandle(scene, handles.frame)
      disposeHandle(scene, handles.labels)
      disposeHandle(scene, handles.title)
      handles.texture?.dispose()
      handles.sheetTexture?.dispose()
    },
  }
}

/**
 * Build the map's overlays. Nothing is drawn until something is rebuilt.
 * @param deps - the scene to draw into, the live tunables and the loaded sources
 * @returns the layers
 */
export function createMapLayers(deps: MapLayersDeps): MapLayers {
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
      compass: null,
      sheet: null,
      frame: null,
      labels: null,
      title: null,
      sheetTexture: null,
    },
  }
  return { ...layerRebuilders(context), ...layerSetters(context), ...layerLifecycle(context) }
}
