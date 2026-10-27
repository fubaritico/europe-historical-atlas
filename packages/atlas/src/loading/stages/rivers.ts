/**
 * The rivers: loaded on their own, installed once the relief is in to drape them on — refused when they cover other
 * ground.
 */

import { boundsDisagreement } from '@europe-historical-atlas/core/data/assetError'

import { RIVERS_URL } from '../assets'

import type { PipelineContext } from '../pipelineContext'

/**
 * Load the rivers, independently of everything else.
 *
 * Neither blocks the other, and the second to arrive settles them (`settleRivers`): the check needs
 * both, and so does the rebuild — the terrain to drape on and the centrelines to drape.
 * @param context - the pipeline's world
 * @returns nothing; it settles on its own
 */
export function loadRivers(context: PipelineContext): void {
  void context.assets.rivers
    .load()
    .then((loaded) => {
      if (context.isDisposed()) return
      // Hold the rivers aside, and install them now if the relief is already in.
      context.pendingRivers.set = loaded
      settleRivers(context)
    })
    .catch((error: unknown) => {
      // A failed river file is told; the map goes on without its rivers.
      context.ui.reportAssetFailure('rivers', error)
    })
}

/**
 * Install the rivers once both they and the relief are in — refused when they cover other ground.
 *
 * **The same check the land mask gets**, and the same answer (`loadTerrain`): the `(u, v)` of every
 * point were computed against the rivers' own box, and are draped over the relief's — a payload cropped
 * differently would slide every river off its valley with no error anywhere. So the map comes up without
 * its rivers, and says so, rather than with rivers in the wrong place (session review, 2026-10-12;
 * the Cartographer refuses the same case since 2026-10-11).
 * @param context - the pipeline's world
 */
export function settleRivers(context: PipelineContext): void {
  const pending = context.pendingRivers.set
  const dem = context.sources.heightmap
  // Ready means draped for real: with no relief source yet, the drape puts every river at sea level
  // without a word (session review ARCH-001, 2026-10-12) — so the rivers wait for both.
  if (pending === null || dem === null || context.sources.reliefSource === null) return
  // Consume the pending set, so it is settled only once.
  context.pendingRivers.set = null
  // Refuse rivers whose box is not the relief's, and say so.
  const disagreement = boundsDisagreement(dem.meta.bbox, pending.bbox, 'rivers', RIVERS_URL)
  if (disagreement !== null) {
    context.ui.reportAssetFailure('rivers', disagreement)
    return
  }
  // Install them and drape them on the relief.
  context.sources.riverData = pending.rivers
  context.layers.rebuildRivers()
}
