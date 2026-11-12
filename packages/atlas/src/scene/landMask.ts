/**
 * The land as the shoreline, the rivers and the tribes read it: the mask asset, or its declared fallback.
 */

import { shorelineMask } from '../sources/mapSources'

import { createLandTextures } from './relief/landTextures'

import type { LayerContext } from './layers/layerContext'
import type { LandTextures } from './relief/landTextures'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'

/**
 * The land mask, or the documented degraded fallback when the asset failed — see {@link shorelineMask}.
 * @param context - the layers and what they read
 * @returns a mask
 * @throws before the elevation is in, when there is neither a mask nor anything to threshold — every caller
 *   waits for the heightmap first, so reaching it is a defect
 */
export function maskOrFallback(context: LayerContext): LandMask {
  const mask = shorelineMask(context.sources, context.dev.texture.seaLevel)
  if (!mask) throw new Error('map layers: no elevation to threshold')
  return mask
}

/**
 * The land mask on the GPU, made from {@link maskOrFallback} at the first layer that needs it and kept on the handles,
 * freed with the other textures at teardown.
 * @param context - the layers and what they read
 * @returns the mask's two textures
 */
export function landTexturesOf(context: LayerContext): LandTextures {
  context.handles.land ??= createLandTextures(maskOrFallback(context))
  return context.handles.land
}
