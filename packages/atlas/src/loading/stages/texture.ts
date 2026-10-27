/**
 * The terrain texture: the compute handed the sources it bakes from, then the bake hung on the relief.
 */

import { paintsExactFills } from '../../scene/political/paintsExactFills'
import { wrapTerrainTexture } from '../../scene/relief/terrainTexture'

import type { PipelineContext } from '../pipelineContext'
import type { ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'

/**
 * Hand the compute the sources it reads.
 *
 * Copied across, never transferred: this thread keeps drawing the relief and draping overlays from the
 * very same buffers, so handing them over would leave the map without its terrain.
 * @param context - the pipeline's world
 * @returns once the compute holds them
 */
export async function pushSources(context: PipelineContext): Promise<void> {
  const dem = context.sources.heightmap
  if (!dem) return
  const mask = context.sources.landMask
  // Send the elevation and the mask, the mask packed to bits, or null when it failed.
  await context.box.compute.setSources({
    heightmap: { meta: dem.meta, data: dem.data },
    landMask: mask ? { meta: mask.meta, bits: mask.pack() } : null,
  })
}

/**
 * Re-bake the terrain texture and hang it on the relief.
 * @param context - the pipeline's world
 * @param onProgress - where to announce the bake
 * @returns once it is on screen, or once a newer bake has superseded this one
 */
export async function rebuildTexture(
  context: PipelineContext,
  onProgress?: ProgressReport
): Promise<void> {
  if (!context.sources.heightmap) return
  // Take a ticket: a bake started after this one makes this one stale.
  const isCurrent = context.bakeGate.begin()
  // When the fills carry an authored year's colour, the texture is the bare terrain they composite onto:
  // tinted twice, the colour would show the grid's staircase under the exact one.
  const options = paintsExactFills(context.dev, context.sources)
    ? { ...context.dev.texture, politicalStrength: 0 }
    : context.dev.texture
  const baked = await context.box.compute.bakeTerrain(options, onProgress)
  if (context.isDisposed() || !isCurrent()) return
  // Wrap the baked pixels as a texture and hang it on the relief.
  context.layers.setTexture(wrapTerrainTexture(baked.rgba, baked.width, baked.height))
}
