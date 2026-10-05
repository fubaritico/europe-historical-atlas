import { bakeTerrainPixels } from '@europe-historical-atlas/core/pipeline/inlineCompute'
import { DEFAULT_TERRAIN_OPTIONS } from '@europe-historical-atlas/core/pipeline/terrainOptions'

import type { Heightmap } from '@europe-historical-atlas/core/data/heightmap'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'
import type { TerrainTextureOptions } from '@europe-historical-atlas/core/pipeline/terrainOptions'

/**
 * The backdrop: the atlas's own baked terrain, under the canvas.
 *
 * **It is the atlas's texture and not a picture of it** — `s99`, among the things settled and recorded so
 * they are not reopened: *"The backdrop is the atlas's own baked texture, with the political tint
 * cleared."* That is what makes it the only thing on this canvas georeferenced **by construction**: zero
 * registration, zero error, because it is literally the output image of the renderer the editor feeds.
 *
 * **Baking rather than shipping a PNG**, decided before step 4: the spike `terrain-bitmap` proved the
 * compositor runs outside a browser, and a third copy of a 6.6 MB image is a copy that drifts from its
 * generator. The same pixels are produced here from the same two sources.
 *
 * **The political tint is cleared by never installing one.** `bakeTerrainPixels` takes the installed year
 * as its last argument and a `null` there bakes bare terrain — so there is no state to clear and no
 * `clearPolitical` call to forget. Read off the signature rather than assumed: the tint seam is built only
 * when a raster is handed over.
 */

/** A baked backdrop: its pixels, and the grid they cover. */
export interface BakedBackdrop {
  /** RGBA, four bytes per pixel, row-major from the north-west corner. */
  rgba: Uint8Array
  /** Width in pixels — the DEM's width times the supersample. */
  width: number
  /** Height in pixels. */
  height: number
}

/**
 * Bake the terrain the editor draws on.
 *
 * **It takes the sources, it does not load them.** Loading is a port with an injected base path
 * (`createFetchHeightmapSource`), so where the bytes live is a wiring decision at the composition root —
 * which is the only place that can know, and the only place that should.
 * @param dem - the elevation grid
 * @param mask - which cells are land, or `null` to fall back on an elevation threshold, which is a
 *   declared degraded mode rather than an equivalent: it drowns the polders and dries out the Caspian
 * @param options - the look to composite; defaults to the atlas's own, so the two pictures match
 * @returns the pixels and the size they were baked at
 */
export function bakeBackdrop(
  dem: Heightmap,
  mask: LandMask | null,
  options: TerrainTextureOptions = DEFAULT_TERRAIN_OPTIONS
): BakedBackdrop {
  // `null` for the political raster: bare terrain. The editor paints its own fills over this, so a tint
  // baked in would be a second, stale copy of what the canvas draws live.
  return bakeTerrainPixels(dem, mask, options, null)
}
