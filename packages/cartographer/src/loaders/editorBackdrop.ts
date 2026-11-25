import { createFetchHeightmapSource } from '@europe-historical-atlas/core/data/heightmap'
import { createFetchLandMaskSource } from '@europe-historical-atlas/core/data/landMask'
import { createFetchRiverSource } from '@europe-historical-atlas/core/data/riverSource'
import { DEFAULT_TERRAIN_OPTIONS } from '@europe-historical-atlas/core/pipeline/terrainOptions'

import { bakeToBitmap, loadBackdrop } from './backdropSource'
import { openEditor } from './opening'
import { loadVectorLayers } from './vectorLayers'

import type { OpeningProgress } from './opening'

/**
 * The editor's backdrop, from the assets served over a relative URL exactly as the atlas loads them — moved out of the
 * composition root on 2026-11-25 (CARTO-535), which had grown past its budget.
 *
 * Both paths are the Cartographer's own `publicDir`, which *is* the atlas's (`vite.config.ts`) — so these are the same
 * bytes the published map renders, not a copy of them. The atlas declares the same strings in `mapPipeline.ts`, and
 * they are left as two declarations rather than shared through `core`: a deployment path is not domain code, and the
 * cost of them drifting is a loud `transport` failure at startup, not a silent wrong picture.
 */

/** What the backdrop's load is handed by the composition root. */
export interface EditorBackdropDeps {
  /** The compute worker that bakes the relief. */
  compute: Parameters<typeof loadBackdrop>[0]['compute']
  /** Waits for a painted frame — the window's, injected. */
  afterPaint: Parameters<typeof openEditor>[0]['afterPaint']
}

/**
 * The load of the editor's backdrop: the relief baked, then the coastline and the rivers projected into its frame.
 * @param deps - the compute worker and the wait for a painted frame
 * @returns the load, told how far the opening has got
 */
export function createEditorBackdropLoad(deps: EditorBackdropDeps) {
  return (onProgress: OpeningProgress) =>
    openEditor(
      {
        loadBackdrop: (onBake) =>
          loadBackdrop({
            // The atlas's relief, so the two backdrops are one bake (CORE-421)
            heightmap: createFetchHeightmapSource('/heightmaps/europe-dem-z6-1920'),
            landMask: createFetchLandMaskSource('/masks/europe-land'),
            compute: deps.compute,
            toImage: bakeToBitmap,
            options: DEFAULT_TERRAIN_OPTIONS,
            onProgress: onBake,
          }),
        // After the bake, reusing its mask rather than fetching three megabytes again: the shoreline is traced through
        // that mask, and the frame it is projected into is the one the DEM declared
        loadVectors: (backdrop) =>
          loadVectorLayers({
            mask: backdrop.mask,
            rivers: createFetchRiverSource('/rivers/europe-rivers.json'),
            frame: backdrop.frame,
          }),
        afterPaint: deps.afterPaint,
      },
      onProgress
    )
}
