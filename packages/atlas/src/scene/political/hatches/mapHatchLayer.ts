/**
 * How a year's overlaps are laid on the relief as hatches (ATLAS-399), and when: with the fills and the tribes, on the
 * same relief and the same texture (`rebuildFills`, which has disposed the last).
 */

import { hatchStripeWorld } from '@europe-historical-atlas/core/data/hatchStripes'
import { hatchBuffers } from '@europe-historical-atlas/core/pipeline/hatchBuffers'

import { releaseAfterUpload } from '../../layers/releaseAfterUpload'
import { meshNodeHeights, meshWorldDepth } from '../../relief/reliefMesh'
import { WORLD_WIDTH } from '../../world'

import { createHatchLayer } from './hatchLayer'

import type { LayerContext } from '../../layers/layerContext'

/**
 * Lay the year's hatches on the relief.
 * @param context - the layers and what they read; the fills' preconditions already checked
 * @param grid - the relief's subdivision
 * @param grid.segX - cells across
 * @param grid.segY - cells down
 * @returns nothing
 */
export function rebuildHatches(context: LayerContext, grid: { segX: number; segY: number }): void {
  const { scene, dev, sources, handles } = context
  const bounds = sources.regionSet?.authored?.bbox
  const relief = handles.relief
  const texture = handles.texture
  // A year with no overlap draws none — the common case, not a refusal.
  if (sources.hatches.length === 0 || !bounds || !relief || !texture || !sources.heightmap) return
  const worldDepth = meshWorldDepth(sources.heightmap.meta, WORLD_WIDTH)
  const arrays = hatchBuffers(
    sources.hatches,
    { grid, nodes: meshNodeHeights(relief), worldWidth: WORLD_WIDTH, worldDepth },
    (message) => {
      console.warn(message)
    }
  )
  handles.hatches = createHatchLayer({
    arrays,
    worldWidth: WORLD_WIDTH,
    worldDepth,
    stripeWorld: hatchStripeWorld(bounds, WORLD_WIDTH),
    map: texture,
    mode: dev.texture.politicalMode,
    strength: dev.texture.politicalStrength,
  })
  handles.hatches.object.scale.setY(relief.scale.y)
  scene.add(handles.hatches.object)
  releaseAfterUpload(handles.hatches.object)
}
