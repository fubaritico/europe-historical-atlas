/**
 * What every frame brings up to date on the layers, nothing rebuilt: the relief's exaggeration followed by everything
 * draped on it, and the line work thinned, faded and revealed for the camera's zoom.
 */

import { lerp } from '@europe-historical-atlas/core/utils/math'

import { inlayOpacityScale } from '../political/borders/borderStrokes'
import { homageDetail } from '../political/homageReveal'
import { paintsExactFills } from '../political/paintsExactFills'

import { layersWithRole } from './layerRoles'

import type { LayerContext } from './layerContext'

/** The layers laid on the relief, read once: the table does not change at run time. */
const DRAPED_LAYERS = layersWithRole('draped')

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
export function frameRelief(context: LayerContext, zoom: number): void {
  const { dev, handles } = context
  const relief = handles.relief
  if (!relief) return
  // Zoom-linked vertical exaggeration: full at zoom-out, × `exaggZoomIn` at zoom-in.
  relief.scale.setY(dev.relief.exaggeration * (1 - (1 - dev.relief.exaggZoomIn) * zoom))
  // Every layer laid on the relief takes the same vertical scale, so it stays on the surface: one that keeps a height
  // of its own (the wall, the events) is told the scale; the others are scaled as a whole.
  for (const key of DRAPED_LAYERS) {
    const layer = handles[key]
    if (layer === null) continue
    if ('setReliefScale' in layer) layer.setReliefScale(relief.scale.y)
    else layer.object.scale.setY(relief.scale.y)
  }
}

/**
 * How much of the year's homage this frame's zoom shows — one number for the fills and the borders, so a
 * vassal's colour and its border arrive together (ATLAS-253).
 *
 * **Only where the fills can follow**: when the texture carries the colour — a payload year, or the panel's
 * exact-fills switch off — the bake paints every polity in its own colour, so every border shows too
 * rather than hiding a line between two colours the map does tell apart.
 * @param context - the layers and what they read
 * @param zoom - the camera's zoom in `[0, 1]`
 * @returns the detail, in `[0, homageDepth]`
 */
function frameDetail(context: LayerContext, zoom: number): number {
  const { dev, sources } = context
  if (!paintsExactFills(dev, sources)) return sources.homageDepth
  return homageDetail(zoom, sources.homageDepth, dev.vassals)
}

/**
 * Thin, fade and reveal the line work as the camera moves.
 *
 * A weight that reads as a drawn border close up becomes a rope across the continent from far away, and
 * an edging either side of a hairline reads as an alternation rather than as one border. All of it is a
 * live material uniform, so nothing is rebuilt while zooming.
 * @param context - the layers and what they read
 * @param zoom - the camera's zoom in `[0, 1]`
 * @param pixelsPerUnit - screen pixels per world unit where the camera looks
 * @returns nothing
 */
export function frameLineWork(context: LayerContext, zoom: number, pixelsPerUnit: number): void {
  const { dev, handles } = context
  // The river ranks revealed for this zoom, and the vassals' fills shown to the homage depth it reaches.
  handles.rivers?.setZoom(zoom)
  const detail = frameDetail(context, zoom)
  handles.fills?.setDetail(detail)
  // The tribes' fade, from the panel's live trial: two uniforms, nothing rebuilt.
  handles.tribes?.setFeather(dev.tribes)
  if (handles.borders) {
    // The borders show the same homage depth as the fills, so a vassal's colour and its border arrive together.
    handles.borders.setDetail(detail)
    // A patterned border holds a plain border's weight at continent scale, then thins to the core's
    // weight close up — hence the ratio rather than a knob: it is the same width the inlay uses.
    const patternAtZoomIn = dev.political.borderWidth / dev.political.borderEdgeWidth
    handles.borders.setWidthScale(
      lerp(dev.political.borderWidthZoomOut, 1, zoom),
      lerp(dev.political.borderWidthZoomOut, patternAtZoomIn, zoom)
    )
    // Fainter from afar, and the inlay faded in by its own zoom setting.
    handles.borders.setOpacityScale(lerp(dev.political.borderOpacityZoomOut, 1, zoom))
    handles.borders.setInlayOpacity(inlayOpacityScale(zoom, dev.political.borderInlayZoom))
    // The dash pattern is in pixels; the line's length is in world units.
    handles.borders.setDashScale(pixelsPerUnit)
  }
  // The coastline's opacity eased from its zoomed-out value to its zoomed-in one.
  handles.coastline?.setOpacity(lerp(dev.coast.opacity, dev.coast.opacityZoomIn, zoom))
  // The rhumb web fades as you zoom in, so it does not clutter the terrain it is drawn over.
  handles.rhumb?.setOpacity(lerp(dev.rhumb.opacity, dev.rhumb.opacityZoomIn, zoom))
}
